import { parseAbi } from "viem";

export const erc20Abi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
]);

export const farmzClaimAbi = parseAbi([
  "function claim(uint256 amount, uint256 nonce, uint256 deadline, bytes signature)",
  "function paused() view returns (bool)",
  "function nonceUsed(address account, uint256 nonce) view returns (bool)",
  "event Claimed(address indexed account, uint256 amount, uint256 indexed nonce)",
]);
