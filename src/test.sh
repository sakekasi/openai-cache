#!/bin/bash

# use curl to test getting data from the server and logging it to the console


PORT=3000
HOST="http://localhost:$PORT"

echo "Hello World!"

echo

PROMPT="console.log(\"hello"
URL="$HOST/complete?model=text-ada-001&prompt=$PROMPT&maxTokens=10"
echo "requesting: $URL"
RESULT=$(curl -s -X GET "$URL")
echo "success: $?"
echo "prompt: \"$PROMPT\""
echo "completion: \"$RESULT\""

echo

EMBEDDING="Hello"
TEXTS_JSON='["Hello"]'
URL_ENCODED=$(echo "$TEXTS_JSON" | jq -s -R -r @uri)
URL="$HOST/embed?model=text-embedding-ada-002&texts=$URL_ENCODED"
echo "requesting: $URL"
RESULT=$(curl -s -X GET "$URL")
echo "success: $?"
echo "input: \"$EMBEDDING\""
echo "embedding: \"$RESULT\""