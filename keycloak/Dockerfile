# Multi-stage build to install curl
FROM registry.access.redhat.com/ubi9/ubi-minimal:latest AS curl-builder
RUN microdnf install -y curl-minimal && microdnf clean all
# Copy curl and essential libraries to output directory
RUN mkdir -p /output/usr/bin /output/usr/lib64 && \
    cp /usr/bin/curl /output/usr/bin/ && \
    cp /usr/lib64/libcurl.so.4* /output/usr/lib64/ 2>/dev/null; \
    cp /usr/lib64/libnghttp2.so.14* /output/usr/lib64/ 2>/dev/null; \
    cp /usr/lib64/libidn2.so.0* /output/usr/lib64/ 2>/dev/null; \
    cp /usr/lib64/libssl.so.3* /output/usr/lib64/ 2>/dev/null; \
    cp /usr/lib64/libcrypto.so.3* /output/usr/lib64/ 2>/dev/null; \
    cp /usr/lib64/libzstd.so.1* /output/usr/lib64/ 2>/dev/null; \
    cp /usr/lib64/libunistring.so.2* /output/usr/lib64/ 2>/dev/null; \
    true

FROM quay.io/keycloak/keycloak:24.0

# Copy curl and its dependencies from builder
USER root
COPY --from=curl-builder /output/usr/bin/curl /usr/bin/curl
COPY --from=curl-builder /output/usr/lib64/ /usr/lib64/
COPY theme/sampleapp /opt/keycloak/themes/sampleapp
USER 1000

