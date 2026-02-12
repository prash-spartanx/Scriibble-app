# ========================================
# STAGE 1: BUILD
# ========================================
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Cache dependencies
COPY pom.xml .
RUN mvn dependency:go-offline

# Build application
COPY src ./src
RUN mvn clean package -DskipTests

# ========================================
# STAGE 2: RUN
# ========================================
FROM eclipse-temurin:17-jre
WORKDIR /app

# Copy JAR from build stage
COPY --from=build /app/target/*.jar app.jar

# Expose port (change this per service)
EXPOSE 8080

# Start application
ENTRYPOINT ["java", "-jar", "app.jar"]