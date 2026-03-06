FROM hashicorp/terraform:latest

# Install curl for health checks (not included in base image)
RUN apk add --no-cache curl jq

WORKDIR /terraform
COPY providers.tf terraform.tf /terraform/
COPY *.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/*.sh
VOLUME /state

RUN terraform init
ENTRYPOINT []
CMD ["/usr/local/bin/local.sh"]
