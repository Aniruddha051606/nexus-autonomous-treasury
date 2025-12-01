import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    hardhat: {
      forking: {
        url: "https://eth.drpc.org", // Mainnet Fork
      }
    },
    // Useful if you want to explicitly target localhost
    localhost: {
      url: "http://127.0.0.1:8545",
    }
  }
};

export default config;