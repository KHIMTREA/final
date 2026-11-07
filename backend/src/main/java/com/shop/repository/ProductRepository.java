package com.shop.repository;

import com.shop.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {

    Page<Product> findByStatus(String status, Pageable pageable);

    List<Product> findByStatusAndStockQuantityLessThanEqual(String status, int threshold);

    @Query("SELECT COUNT(p) FROM Product p WHERE p.status = 'ACTIVE' AND p.stockQuantity <= 5")
    long countLowStock();

    long countByStatus(String status);
}
