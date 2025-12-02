ARG N8N_VERSION=latest

# ==============================================================================
# STAGE 1: SentencePiece Builder
# ==============================================================================
FROM alpine:3.22.0 AS sentencepiece-builder

RUN apk add --no-cache git build-base cmake

COPY models/sentencepiece/ /sentencepiece/
WORKDIR /sentencepiece

RUN mkdir build && cd build && \
    cmake .. -DSPM_ENABLE_SHARED=OFF -DSPM_ENABLE_TCMALLOC=OFF -DCMAKE_EXE_LINKER_FLAGS="-static" && \
    make -j$(nproc) spm_encode

# ==============================================================================
# STAGE 2: Final Runtime Image
# ==============================================================================
FROM n8nio/n8n:${N8N_VERSION}

USER root

# Copy SentencePiece tool
COPY --from=sentencepiece-builder /sentencepiece/build/src/spm_encode /usr/local/bin/spm_encode
COPY infrastructure/third_party/n8n/scripts/tokenize.sh /usr/local/bin/tokenize.sh

RUN chmod +x /usr/local/bin/tokenize.sh && \
    chown node:node /usr/local/bin/tokenize.sh

USER node
