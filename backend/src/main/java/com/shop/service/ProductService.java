package com.shop.service;

import com.shop.dto.ProductDtos.*;
import com.shop.entity.Product;
import com.shop.exception.ApiException;
import com.shop.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final AuditService auditService;

    public Page<ProductResponse> getActiveProducts(Pageable pageable) {
        return productRepository.findByStatus("ACTIVE", pageable)
                .map(this::toResponse);
    }

    public Page<ProductResponse> getAllProducts(Pageable pageable) {
        return productRepository.findAll(pageable).map(this::toResponse);
    }

    public ProductResponse getById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
        if (!"ACTIVE".equals(product.getStatus())) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Product not found");
        }
        return toResponse(product);
    }

    @Transactional
    public ProductResponse create(CreateProductRequest request) {
        Product product = Product.builder()
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .stockQuantity(request.getStockQuantity())
                .imageUrl(request.getImageUrl())
                .status(request.getStatus() != null ? request.getStatus() : "ACTIVE")
                .build();

        product = productRepository.save(product);
        auditService.log("CREATE_PRODUCT", "PRODUCT", product.getId(),
                "Created product: " + product.getName());
        return toResponse(product);
    }

    @Transactional
    public ProductResponse update(Long id, UpdateProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));

        if (request.getName() != null) product.setName(request.getName());
        if (request.getDescription() != null) product.setDescription(request.getDescription());
        if (request.getPrice() != null) product.setPrice(request.getPrice());
        if (request.getStockQuantity() != null) product.setStockQuantity(request.getStockQuantity());
        if (request.getImageUrl() != null) product.setImageUrl(request.getImageUrl());
        if (request.getStatus() != null) product.setStatus(request.getStatus());

        product = productRepository.save(product);
        auditService.log("UPDATE_PRODUCT", "PRODUCT", product.getId(),
                "Updated product: " + product.getName());
        return toResponse(product);
    }

    @Transactional
    public void delete(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
        product.setStatus("INACTIVE");
        productRepository.save(product);
        auditService.log("DELETE_PRODUCT", "PRODUCT", id, "Archived product: " + product.getName());
    }

    private ProductResponse toResponse(Product p) {
        return ProductResponse.builder()
                .id(p.getId())
                .name(p.getName())
                .description(p.getDescription())
                .price(p.getPrice())
                .stockQuantity(p.getStockQuantity())
                .imageUrl(p.getImageUrl())
                .status(p.getStatus())
                .createdAt(p.getCreatedAt())
                .build();
    }
}
