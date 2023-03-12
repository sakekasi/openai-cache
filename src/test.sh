#!/bin/bash

# use curl to test getting data from the server and logging it to the console


PORT=3000
HOST="http://localhost:$PORT"

echo "Hello World!"

echo

PROMPT="console.log(\"hello"
# if DISABLE_CACHE is set, then the server will not cache openai requests
if [ -n "$DISABLE_CACHE" ]; then
  DISABLE_CACHE_PARAM="&disableCache=true"
else
  DISABLE_CACHE_PARAM=""
fi
URL="$HOST/complete?model=text-ada-001&prompt=$PROMPT&maxTokens=10$DISABLE_CACHE_PARAM"
echo "requesting: $URL"
RESULT=$(curl -s -X GET "$URL")
echo "success: $?"
echo "prompt: \"$PROMPT\""
echo "completion: \"$RESULT\""

echo

EMBEDDING="Hello"
TEXTS_JSON='["Hello"]'
URL_ENCODED=$(echo "$TEXTS_JSON" | jq -s -R -r @uri)
URL="$HOST/embed?model=text-embedding-ada-002&texts=$URL_ENCODED$DISABLE_CACHE_PARAM"
echo "requesting: $URL"
RESULT=$(curl -s -X GET "$URL")
echo "success: $?"
echo "input: \"$EMBEDDING\""
echo "embedding: \"$RESULT\""