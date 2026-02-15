#!/bin/bash
set -e
cd "$(dirname "$0")/.."
forge inspect ClawmedyToken abi > ../shared/abis/ClawmedyToken.json
forge inspect WagerEscrow abi > ../shared/abis/WagerEscrow.json
echo "ABIs exported to ../shared/abis/"
