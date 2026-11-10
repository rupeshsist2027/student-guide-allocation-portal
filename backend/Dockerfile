# Stage 1: Build Spring Boot executable JAR
FROM maven:3.9.9-eclipse-temurin-17-alpine AS builder
WORKDIR /build

COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B clean package -DskipTests

# Stage 2: Minimal Java 17 Alpine runtime tuned for Render Free Tier (512 MB RAM)
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Install CA certificates so Java 17 trusts TiDB Cloud Starter TLS 1.2/1.3 endpoints
RUN apk add --no-cache ca-certificates wget \
    && update-ca-certificates \
    && addgroup -S spring \
    && adduser -S spring -G spring

COPY --from=builder /build/target/*.jar app.jar
RUN chown spring:spring app.jar
USER spring:spring

# Render supplies $PORT dynamically at runtime (application.properties binds server.port=${PORT:8081})
EXPOSE 8081

# Restrict JVM heap, metaspace & thread stack so total RSS stays safely within 512 MB Render Free RAM
ENV JAVA_OPTS="-XX:+UseSerialGC -Xms96m -Xmx256m -XX:MaxMetaspaceSize=110m -XX:ReservedCodeCacheSize=32m -Xss512k -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom"
ENV SPRING_PROFILES_ACTIVE=prod

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
