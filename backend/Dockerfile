# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

COPY pom.xml .
COPY src ./src

RUN apk add --no-cache maven && \
    mvn dependency:go-offline -q && \
    mvn package -DskipTests -q

# ── Stage 2: runtime ────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S quanta && adduser -S quanta -G quanta
USER quanta

COPY --from=builder /app/target/analisis-financiero-1.0.0.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-jar", "app.jar"]
