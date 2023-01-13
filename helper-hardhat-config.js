const networkConfig = {
    31337: {
        name: "localhost",
        cityDAOCitizenNFTContract: "0x7EeF591A6CC0403b9652E98E88476fe1bF31dDeb",
        PoHContract: "0xC5E9dDebb09Cd64DfaCab4011A0D5cEDaf7c9BDb",
    },
    5: {
        name: "goerli",
        PoHContract: "0xc94506146A45f2B99f2673DD4ecaC2678E65381e",
    },
    1: {
        name: "mainnet",
        cityDAOCitizenNFTContract: "0x7EeF591A6CC0403b9652E98E88476fe1bF31dDeb",
        PoHContract: "0xC5E9dDebb09Cd64DfaCab4011A0D5cEDaf7c9BDb",
    },
};

const DECIMALS = "18";
const INITIAL_SUPPLY = "1000000000000000000000";
const INITIAL_UBI_PAYMENT = "1000000000000000000000";
const developmentChains = ["hardhat", "localhost"];

module.exports = {
    networkConfig,
    developmentChains,
    DECIMALS,
    INITIAL_SUPPLY,
    INITIAL_UBI_PAYMENT,
};
