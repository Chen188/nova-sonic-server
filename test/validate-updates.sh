#!/bin/bash
##############################################################################
# Nova Sonic Server Update Validation Script
# Tests all the updates made for TEN-Agent compatibility
##############################################################################

set -e

echo "════════════════════════════════════════════════════════════════"
echo "         Nova Sonic Server Update Validation"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to print test results
test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗${NC} $2"
        ((TESTS_FAILED++))
    fi
}

echo "Test 1: Check if modelId configuration exists in client.ts"
if grep -q "modelId?: string" src/client.ts && grep -q "private modelId: string" src/client.ts; then
    test_result 0 "modelId configuration exists"
else
    test_result 1 "modelId configuration missing"
fi

echo ""
echo "Test 2: Check if environment variable support exists"
if grep -q "AWS_BEDROCK_NOVA_SONIC_MODEL_ID" src/client.ts; then
    test_result 0 "Environment variable support exists"
else
    test_result 1 "Environment variable support missing"
fi

echo ""
echo "Test 3: Check if server.ts uses modelId from environment"
if grep -q "AWS_BEDROCK_NOVA_SONIC_MODEL_ID" src/server.ts; then
    test_result 0 "Server uses environment variable"
else
    test_result 1 "Server missing environment variable"
fi

echo ""
echo "Test 4: Check if Dockerfile has new environment variable"
if grep -q "AWS_BEDROCK_NOVA_SONIC_MODEL_ID" Dockerfile; then
    test_result 0 "Dockerfile updated with environment variable"
else
    test_result 1 "Dockerfile missing environment variable"
fi

echo ""
echo "Test 5: Check if README documents environment variables"
if grep -q "AWS_BEDROCK_NOVA_SONIC_MODEL_ID" README.md; then
    test_result 0 "README updated with documentation"
else
    test_result 1 "README missing documentation"
fi

echo ""
echo "Test 6: Check if audio validation exists in client.ts"
if grep -q "Empty audio data provided to streamAudio" src/client.ts; then
    test_result 0 "Audio validation implemented"
else
    test_result 1 "Audio validation missing"
fi

echo ""
echo "Test 7: Check if server has enhanced logging"
if grep -q "Server configuration:" src/server.ts; then
    test_result 0 "Enhanced logging implemented"
else
    test_result 1 "Enhanced logging missing"
fi

echo ""
echo "Test 8: Check if getModelId method exists"
if grep -q "public getModelId()" src/client.ts; then
    test_result 0 "getModelId method exists"
else
    test_result 1 "getModelId method missing"
fi

echo ""
echo "Test 9: Check if setModelId method exists"
if grep -q "public setModelId" src/client.ts; then
    test_result 0 "setModelId method exists"
else
    test_result 1 "setModelId method missing"
fi

echo ""
echo "Test 10: Check if modelId is used instead of hardcoded value"
if grep -q "modelId: this.modelId" src/client.ts && ! grep -q 'modelId: "amazon.nova-sonic-v1:0"' src/client.ts; then
    test_result 0 "Dynamic modelId is used"
else
    test_result 1 "Hardcoded modelId still exists"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "                      Test Summary"
echo "════════════════════════════════════════════════════════════════"
echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All validation tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some validation tests failed!${NC}"
    exit 1
fi
