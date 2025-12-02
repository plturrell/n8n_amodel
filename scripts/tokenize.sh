#!/bin/sh
# Wrapper for spm_encode
# Usage: tokenize.sh <model_path> <text>

if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <model_path> <text>"
    exit 1
fi

MODEL="$1"
shift
TEXT="$@"

# Check if model exists
if [ ! -f "$MODEL" ]; then
    echo "Error: Model file not found: $MODEL"
    exit 1
fi

# Run spm_encode
echo "$TEXT" | spm_encode --model="$MODEL" --output_format=piece
