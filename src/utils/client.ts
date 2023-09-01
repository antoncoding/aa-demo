import {
  SmartAccountProvider,
  createPublicErc4337FromClient,
  type PublicErc4337Client,
} from "@alchemy/aa-core";
import { createPublicClient, custom, http, type Chain } from "viem";
import { goerli } from "viem/chains";

const bundlerRpcMethods = new Set([
  "eth_estimateUserOperationGas",
  "eth_sendUserOperation",
  "eth_getUserOperationByHash",
  "eth_getUserOperationReceipt",
  "eth_supportedEntryPoints",
]);

// Use this when calling new SmartAccountProvider
export const createSplitRpcClient = (
  bundlerRpcUrl: string,
  nodeRpcUrl: string,
  chain: Chain
): PublicErc4337Client => {
  const bundlerTransport = http(bundlerRpcUrl)({ chain });
  const nodeTransport = http(nodeRpcUrl)({ chain });

  const client = createPublicClient({
    chain,
    transport: custom({
      async request({ method, params }) {
        if (bundlerRpcMethods.has(method)) {
          return bundlerTransport.request({ method, params });
        } else {
          return nodeTransport.request({ method, params });
        }
      },
    }),
  });

  return createPublicErc4337FromClient(client);
};
