FROM gradle:8.10.2-jdk21 AS build

WORKDIR /workspace
COPY . .
RUN gradle --no-daemon bootJar

FROM eclipse-temurin:21-jre-alpine

WORKDIR /app
RUN addgroup -S spring && adduser -S spring -G spring
COPY --from=build /workspace/build/libs/bakong-shop-backend.jar app.jar
USER spring:spring

EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
