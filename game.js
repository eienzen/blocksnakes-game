function initializeGame() {
    if (typeof ethers === "undefined") {
        console.error("Ethers library not loaded. Please ensure the library is loaded correctly.");
        alert("Failed to load Ethers library. Please refresh the page and try again.");
        return;
    }

    console.log("DOM fully loaded, initializing game...");

    let account = null;
    let contract = null;
    let animationFrameId = null;
    const TARGET_NETWORK_ID = "97"; // BNB Chain Testnet
    let isGameRunning = false;
    let ownerWallet = null;
    let isOwner = false;

    let playerData = JSON.parse(localStorage.getItem("playerData")) || {
        gamesPlayed: 0,
        totalRewards: 0,
        boxesEaten: 0,
        pendingRewards: 0,
        totalReferrals: 0,
        referralRewards: 0,
        pendingReferral: null,
        pendingReferrerReward: 0,
        rewardHistory: [],
        stakeHistory: [],
        feeHistory: [],
        hasClaimedWelcomeBonus: false,
        walletBalance: 0,
        walletAddress: null,
        flexibleStakeBalance: 0,
        lockedStakeBalances: { 0: 0, 1: 0, 2: 0, 3: 0 },
        lockedStakeStartTimes: { 0: 0, 1: 0, 2: 0, 3: 0 }
    };

    const urlParams = new URLSearchParams(window.location.search);
    const referrerAddress = urlParams.get("ref");
    if (referrerAddress && !playerData.pendingReferral && ethers.utils.isAddress(referrerAddress)) {
        playerData.pendingReferral = referrerAddress;
    }

    const CONTRACT_ADDRESS = "0x69C87Db2308b261D7C7371C191F755ac378E459b";
    const GAME_ORACLE_ADDRESS = "0x6C12d2802cCF7072e9ED33b3bdBB0ce4230d5032";
    const CONTRACT_ABI = [
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "_gameOracle",
                    "type": "address"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "constructor"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "spender",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "allowance",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "needed",
                    "type": "uint256"
                }
            ],
            "name": "ERC20InsufficientAllowance",
            "type": "error"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "sender",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "balance",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "needed",
                    "type": "uint256"
                }
            ],
            "name": "ERC20InsufficientBalance",
            "type": "error"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "approver",
                    "type": "address"
                }
            ],
            "name": "ERC20InvalidApprover",
            "type": "error"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                }
            ],
            "name": "ERC20InvalidReceiver",
            "type": "error"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "sender",
                    "type": "address"
                }
            ],
            "name": "ERC20InvalidSender",
            "type": "error"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "spender",
                    "type": "address"
                }
            ],
            "name": "ERC20InvalidSpender",
            "type": "error"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "owner",
                    "type": "address"
                }
            ],
            "name": "OwnableInvalidOwner",
            "type": "error"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "account",
                    "type": "address"
                }
            ],
            "name": "OwnableUnauthorizedAccount",
            "type": "error"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "owner",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "spender",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "value",
                    "type": "uint256"
                }
            ],
            "name": "Approval",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "multiplier",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "duration",
                    "type": "uint256"
                }
            ],
            "name": "BoosterPurchased",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                }
            ],
            "name": "DailyLoginBonusClaimed",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "oldOracle",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "newOracle",
                    "type": "address"
                }
            ],
            "name": "GameOracleUpdated",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "newLimit",
                    "type": "uint256"
                }
            ],
            "name": "MaxWithdrawalLimitUpdated",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "bytes32",
                    "name": "dataHash",
                    "type": "bytes32"
                },
                {
                    "indexed": false,
                    "internalType": "bool",
                    "name": "verified",
                    "type": "bool"
                }
            ],
            "name": "OracleDataUpdated",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "oldWallet",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "newWallet",
                    "type": "address"
                }
            ],
            "name": "OwnerWalletUpdated",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "previousOwner",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "newOwner",
                    "type": "address"
                }
            ],
            "name": "OwnershipTransferred",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "referrer",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "referee",
                    "type": "address"
                }
            ],
            "name": "ReferralAdded",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "newRate",
                    "type": "uint256"
                }
            ],
            "name": "ReferralCommissionRateUpdated",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "player",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "totalReward",
                    "type": "uint256"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "referrer",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "referrerReward",
                    "type": "uint256"
                }
            ],
            "name": "RewardsClaimed",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "address[]",
                    "name": "topUsers",
                    "type": "address[]"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "rewardPerUser",
                    "type": "uint256"
                }
            ],
            "name": "RewardsDistributed",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "owner",
                    "type": "address"
                }
            ],
            "name": "SecretKeyUpdated",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "owner",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                }
            ],
            "name": "TokensBurned",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "owner",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "totalAmount",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "ownerAmount",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "contractAmount",
                    "type": "uint256"
                }
            ],
            "name": "TokensMinted",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "lockPeriod",
                    "type": "uint256"
                }
            ],
            "name": "TokensStaked",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "from",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "to",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                }
            ],
            "name": "TokensTransferred",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "reward",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "lockPeriod",
                    "type": "uint256"
                }
            ],
            "name": "TokensUnstaked",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "player",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "fee",
                    "type": "uint256"
                }
            ],
            "name": "TokensWithdrawn",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "from",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "to",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "value",
                    "type": "uint256"
                }
            ],
            "name": "Transfer",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "player",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                }
            ],
            "name": "WelcomeBonusClaimed",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "newFeeInBnbWei",
                    "type": "uint256"
                }
            ],
            "name": "WithdrawalFeeUpdated",
            "type": "event"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "name": "activeUsers",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "owner",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "spender",
                    "type": "address"
                }
            ],
            "name": "allowance",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "spender",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "value",
                    "type": "uint256"
                }
            ],
            "name": "approve",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "account",
                    "type": "address"
                }
            ],
            "name": "balanceOf",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "name": "boosters",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "isActive",
                    "type": "bool"
                },
                {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "multiplier",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                },
                {
                    "internalType": "string",
                    "name": "_key",
                    "type": "string"
                }
            ],
            "name": "burnTokens",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "boxesEaten",
                    "type": "uint256"
                },
                {
                    "internalType": "address",
                    "name": "player",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "referrer",
                    "type": "address"
                }
            ],
            "name": "claimAllRewards",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "claimDailyLoginBonus",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "claimWelcomeBonus",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "collectedFees",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "name": "competitionData",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "hasJoined",
                    "type": "bool"
                },
                {
                    "internalType": "uint256",
                    "name": "gamesPlayed",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "boxesEaten",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "contractBalance",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "decimals",
            "outputs": [
                {
                    "internalType": "uint8",
                    "name": "",
                    "type": "uint8"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "_secret",
                    "type": "string"
                }
            ],
            "name": "distributeCompetitionRewards",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "gameOracle",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "player",
                    "type": "address"
                }
            ],
            "name": "getInternalBalance",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "player",
                    "type": "address"
                }
            ],
            "name": "getRewardHistory",
            "outputs": [
                {
                    "components": [
                        {
                            "internalType": "uint256",
                            "name": "amount",
                            "type": "uint256"
                        },
                        {
                            "internalType": "uint256",
                            "name": "timestamp",
                            "type": "uint256"
                        },
                        {
                            "internalType": "string",
                            "name": "rewardType",
                            "type": "string"
                        },
                        {
                            "internalType": "address",
                            "name": "referee",
                            "type": "address"
                        }
                    ],
                    "internalType": "struct BlockSnakesGame.Reward[]",
                    "name": "",
                    "type": "tuple[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "owner",
                    "type": "address"
                }
            ],
            "name": "getFeeHistory",
            "outputs": [
                {
                    "components": [
                        {
                            "internalType": "address",
                            "name": "user",
                            "type": "address"
                        },
                        {
                            "internalType": "uint256",
                            "name": "amount",
                            "type": "uint256"
                        },
                        {
                            "internalType": "uint256",
                            "name": "timestamp",
                            "type": "uint256"
                        },
                        {
                            "internalType": "string",
                            "name": "feeType",
                            "type": "string"
                        }
                    ],
                    "internalType": "struct BlockSnakesGame.FeeRecord[]",
                    "name": "",
                    "type": "tuple[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "name": "isActiveUser",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "joinCompetition",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "lastDistribution",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "lastOracleUpdate",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "name": "lockedStakes",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "balance",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "startTime",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "rewardRate",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "maxWithdrawalLimit",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                },
                {
                    "internalType": "string",
                    "name": "_key",
                    "type": "string"
                }
            ],
            "name": "mintTokens",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "name",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "",
                    "type": "string"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                }
            ],
            "name": "oracleDataVerified",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "owner",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "ownerWallet",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "name": "playerHistory",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "lastLogin",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "gamesPlayed",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "totalRewards",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "totalReferrals",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "referralRewards",
                    "type": "uint256"
                },
                {
                    "internalType": "bool",
                    "name": "hasClaimedWelcomeBonus",
                    "type": "bool"
                },
                {
                    "internalType": "uint256",
                    "name": "internalBalance",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "durationDays",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "multiplier",
                    "type": "uint256"
                }
            ],
            "name": "purchaseBooster",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "referralCommissionRate",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "name": "referrals",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "renounceOwnership",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "name": "rewardHistory",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "timestamp",
                    "type": "uint256"
                },
                {
                    "internalType": "string",
                    "name": "rewardType",
                    "type": "string"
                },
                {
                    "internalType": "address",
                    "name": "referee",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "lockPeriod",
                    "type": "uint256"
                }
            ],
            "name": "stakeTokens",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "symbol",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "",
                    "type": "string"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "totalSupply",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "to",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "value",
                    "type": "uint256"
                }
            ],
            "name": "transfer",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "from",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "to",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "value",
                    "type": "uint256"
                }
            ],
            "name": "transferFrom",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "to",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                }
            ],
            "name": "transferFromInternalToWallet",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "newOwner",
                    "type": "address"
                }
            ],
            "name": "transferOwnership",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "to",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                }
            ],
            "name": "transferToWallet",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "lockPeriod",
                    "type": "uint256"
                }
            ],
            "name": "unstakeTokens",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "_newOracle",
                    "type": "address"
                },
                {
                    "internalType": "string",
                    "name": "_key",
                    "type": "string"
                }
            ],
            "name": "updateGameOracle",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_newLimit",
                    "type": "uint256"
                },
                {
                    "internalType": "string",
                    "name": "_key",
                    "type": "string"
                }
            ],
            "name": "updateMaxWithdrawalLimit",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "bytes32",
                    "name": "dataHash",
                    "type": "bytes32"
                },
                {
                    "internalType": "string",
                    "name": "_secret",
                    "type": "string"
                }
            ],
            "name": "updateOracleData",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "_newWallet",
                    "type": "address"
                },
                {
                    "internalType": "string",
                    "name": "_key",
                    "type": "string"
                }
            ],
            "name": "updateOwnerWallet",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_newRate",
                    "type": "uint256"
                },
                {
                    "internalType": "string",
                    "name": "_key",
                    "type": "string"
                }
            ],
            "name": "updateReferralCommissionRate",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "_newKey",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "_currentKey",
                    "type": "string"
                }
            ],
            "name": "updateSecretKey",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_newFeeInBnbWei",
                    "type": "uint256"
                },
                {
                    "internalType": "string",
                    "name": "_key",
                    "type": "string"
                }
            ],
            "name": "updateWithdrawalFee",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "viewUserRecords",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "totalRewards",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "gamesPlayed",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "referralRewards",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "internalBalance",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "withdrawAllTokens",
            "outputs": [],
            "stateMutability": "payable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "_key",
                    "type": "string"
                }
            ],
            "name": "withdrawCollectedFees",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "withdrawalFeeInBnb",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "stateMutability": "payable",
            "type": "receive"
        }
    ];

    let gameOracleProvider;
    try {
        gameOracleProvider = new ethers.providers.JsonRpcProvider("https://data-seed-prebsc-1-s1.bnbchain.org:8545", { chainId: 97, name: "BNB Testnet" });
        console.log("Connected to JSON-RPC provider.");
    } catch (error) {
        console.error("Failed to connect to primary provider:", error);
        try {
            gameOracleProvider = new ethers.providers.JsonRpcProvider("https://data-seed-prebsc-2-s1.bnbchain.org:8545", { chainId: 97, name: "BNB Testnet" });
            console.log("Connected to backup JSON-RPC provider.");
        } catch (backupError) {
            console.error("Failed to connect to backup provider:", backupError);
            alert("Cannot connect to BNB Testnet. Please check your network.");
        }
    }

    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas ? canvas.getContext("2d") : null;
    const gridWidth = 30;
    const gridHeight = 20;
    let gridSize;
    let snake = [{ x: 10, y: 10 }];
    let boxes = [];
    let direction = "right";
    let boxesEaten = 0;
    let gameBoxesEaten = 0; // To track boxes eaten in the current game session
    const baseSnakeSpeed = 150;
    let lastMoveTime = 0;

    const eatingSound = document.getElementById("eatingSound");
    const gameOverSound = document.getElementById("gameOverSound");
    const victorySound = document.getElementById("victorySound");

    function showLoading(show) {
        const loadingIndicator = document.getElementById("loadingIndicator");
        if (loadingIndicator) {
            loadingIndicator.style.display = show ? "block" : "none";
        }
    }

    function updateCanvasSize() {
        if (!canvas) return console.error("Canvas not available!");
        const screenWidth = window.innerWidth * 0.9;
        const screenHeight = window.innerHeight * 0.7;
        gridSize = Math.min(screenWidth / gridWidth, screenHeight / gridHeight);
        canvas.width = gridSize * gridWidth;
        canvas.height = gridSize * gridHeight;
        canvas.style.width = `${canvas.width}px`;
        canvas.style.height = `${canvas.height}px`;
        draw();
    }

    function enterFullscreen() {
        if (document.fullscreenEnabled && canvas) {
            canvas.requestFullscreen().catch(err => console.warn("Fullscreen failed:", err));
        }
        updateCanvasSize();
    }

    function generateBoxes() {
        boxes = [];
        const numBoxes = 10;
        for (let i = 0; i < numBoxes; i++) {
            let newBox;
            do {
                newBox = { x: Math.floor(Math.random() * gridWidth), y: Math.floor(Math.random() * gridHeight) };
            } while (snake.some(segment => segment.x === newBox.x && segment.y === newBox.y) || boxes.some(b => b.x === newBox.x && b.y === newBox.y));
            boxes.push(newBox);
        }
    }

    function draw() {
        if (!ctx) return console.error("Canvas context not available!");
        ctx.fillStyle = "#0a0a23";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        snake.forEach((segment, index) => {
            ctx.fillStyle = index === 0 ? "#ffd700" : "#800080";
            ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);

            if (index === 0) {
                ctx.beginPath();
                ctx.arc(segment.x * gridSize + gridSize * 0.25, segment.y * gridSize + gridSize * 0.3, gridSize * 0.1, 0, Math.PI * 2);
                ctx.fillStyle = "white";
                ctx.fill();
                ctx.beginPath();
                ctx.arc(segment.x * gridSize + gridSize * 0.25, segment.y * gridSize + gridSize * 0.3, gridSize * 0.05, 0, Math.PI * 2);
                ctx.fillStyle = "black";
                ctx.fill();

                ctx.beginPath();
                ctx.arc(segment.x * gridSize + gridSize * 0.75, segment.y * gridSize + gridSize * 0.3, gridSize * 0.1, 0, Math.PI * 2);
                ctx.fillStyle = "white";
                ctx.fill();
                ctx.beginPath();
                ctx.arc(segment.x * gridSize + gridSize * 0.75, segment.y * gridSize + gridSize * 0.3, gridSize * 0.05, 0, Math.PI * 2);
                ctx.fillStyle = "black";
                ctx.fill();
            }
        });

        boxes.forEach(box => {
            ctx.fillStyle = "#ff5555";
            ctx.fillRect(box.x * gridSize, box.y * gridSize, gridSize - 2, gridSize - 2);
        });

        const boxesEatenElement = document.getElementById("boxesEaten");
        const pendingRewardsElement = document.getElementById("pendingRewards");
        if (boxesEatenElement) {
            boxesEatenElement.textContent = `Boxes Eaten: ${boxesEaten}`;
        }
        if (pendingRewardsElement) {
            pendingRewardsElement.textContent = `Pending Rewards: ${(playerData.pendingRewards || 0).toFixed(2)} BST`;
        }
    }

    function playSound(sound) {
        if (sound && sound.readyState >= 2) {
            sound.play().catch(err => console.warn("Sound play failed:", err));
        } else {
            console.warn("Sound not ready or not found:", sound);
        }
    }

    function gameLoop(currentTime) {
        if (isGameRunning && ctx) {
            if (currentTime - lastMoveTime >= baseSnakeSpeed) {
                move();
                lastMoveTime = currentTime;
            }
            animationFrameId = requestAnimationFrame(gameLoop);
        }
    }

    function move() {
        if (!isGameRunning || !ctx) return;

        let head = { x: snake[0].x, y: snake[0].y };
        if (direction === "right") head.x++;
        if (direction === "left") head.x--;
        if (direction === "up") head.y--;
        if (direction === "down") head.y++;

        if (head.x < 0 || head.x >= gridWidth || head.y < 0 || head.y >= gridHeight || snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            playSound(gameOverSound);
            showGameOverPopup();
            return;
        }

        snake.unshift(head);
        const eatenBoxIndex = boxes.findIndex(box => box.x === head.x && box.y === head.y);
        if (eatenBoxIndex !== -1) {
            playSound(eatingSound);
            boxesEaten++;
            gameBoxesEaten++; // Track boxes eaten in the current game
            playerData.boxesEaten = (playerData.boxesEaten || 0) + 1;
            // Rewards are now calculated in the contract, so we only track boxes eaten
            boxes.splice(eatenBoxIndex, 1);
            if (boxes.length < 5) generateBoxes();
            if (boxesEaten % 10 === 0 || boxesEaten % 20 === 0 || boxesEaten % 30 === 0) playSound(victorySound);
        } else {
            snake.pop();
        }
        draw();
        updatePlayerHistoryUI();
        localStorage.setItem("playerData", JSON.stringify(playerData));
    }

    function showGameOverPopup() {
        const popup = document.getElementById("gameOverPopup");
        if (!popup) return;
        const finalBoxesEatenElement = document.getElementById("finalBoxesEaten");
        const finalRewardsElement = document.getElementById("finalRewards");
        if (finalBoxesEatenElement) {
            finalBoxesEatenElement.textContent = gameBoxesEaten;
        }
        if (finalRewardsElement) {
            // Since rewards are calculated in the contract, we display boxes eaten and let the user know rewards will be claimed
            finalRewardsElement.textContent = `${gameBoxesEaten * 0.5} BST (Claim to receive)`;
        }
        popup.style.display = "block";
        isGameRunning = false;
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
    }

    async function resetGame() {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        isGameRunning = false;
        console.log("Resetting game...");
        showLoading(true);

        if (gameBoxesEaten > 0 && account && contract) {
            try {
                await submitGameReward(gameBoxesEaten);
                await loadPlayerHistory();
            } catch (error) {
                console.error("Error submitting rewards during reset:", error);
                const withdrawalStatusElement = document.getElementById("withdrawalStatus");
                if (withdrawalStatusElement) {
                    withdrawalStatusElement.textContent = `Error: ${error.message}`;
                }
            }
        }

        playerData.gamesPlayed = (playerData.gamesPlayed || 0) + 1;
        boxesEaten = 0;
        gameBoxesEaten = 0;
        snake = [{ x: 10, y: 10 }];
        direction = "right";
        generateBoxes();
        updateCanvasSize();
        draw();
        showLoading(false);
        updatePlayerHistoryUI();
        localStorage.setItem("playerData", JSON.stringify(playerData));
    }

    async function submitGameReward(boxesEatenInGame) {
        if (!account || !contract) return;
        try {
            showLoading(true);
            const tx = await contract.claimAllRewards(
                boxesEatenInGame,
                account,
                playerData.pendingReferral || ethers.constants.AddressZero,
                { gasLimit: 500000 }
            );
            await tx.wait();
            const rewardAmount = boxesEatenInGame * 0.5; // For UI display, since contract handles the actual calculation
            playerData.totalRewards = (playerData.totalRewards || 0) + rewardAmount;
            playerData.pendingRewards = (playerData.pendingRewards || 0) + rewardAmount;
            if (playerData.pendingReferral) {
                const referrerReward = rewardAmount * 0.01; // 1% of the player's reward
                playerData.pendingReferrerReward = (playerData.pendingReferrerReward || 0) + referrerReward;
                playerData.referralRewards = (playerData.referralRewards || 0) + referrerReward;
                playerData.totalReferrals = (playerData.totalReferrals || 0) + 1;
                playerData.rewardHistory.push({ amount: referrerReward, timestamp: Date.now(), rewardType: "Referral", referee: playerData.pendingReferral });
            }
            playerData.pendingReferral = null;
            gameBoxesEaten = 0;
            await loadPlayerHistory();
            updatePlayerHistoryUI();
            alert(`${rewardAmount} BST rewards submitted!`);
        } catch (error) {
            console.error("Error submitting rewards:", error);
            const withdrawalStatusElement = document.getElementById("withdrawalStatus");
            if (withdrawalStatusElement) {
                withdrawalStatusElement.textContent = `Error: ${error.message}`;
            }
            alert("Failed to submit rewards: " + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function claimPendingRewards() {
        if (!account || !contract) return alert("Connect wallet first!");
        try {
            showLoading(true);
            const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
            const signer = await provider.getSigner();
            const balance = await provider.getBalance(account);
            const feeInWei = await contract.withdrawalFeeInBnb();
            const feeInBnb = ethers.utils.formatUnits(feeInWei, "ether");
            if (balance.lt(feeInWei)) {
                alert(`Need ${feeInBnb} BNB for fee.`);
                return;
            }
            const internalBalance = await contract.getInternalBalance(account);
            if (ethers.BigNumber.from(internalBalance).eq(0)) {
                alert("No internal balance to withdraw!");
                return;
            }
            const tx = await contract.withdrawAllTokens({ value: feeInWei, gasLimit: 500000 });
            await tx.wait();
            playerData.walletBalance = Number(ethers.utils.formatUnits(await contract.balanceOf(account), 18));
            playerData.pendingRewards = 0;
            if (isOwner) {
                playerData.feeHistory.push({
                    amount: feeInBnb,
                    from: account,
                    timestamp: Date.now(),
                    type: "Withdraw"
                });
            }
            await loadPlayerHistory();
            updatePlayerHistoryUI();
            alert("Rewards withdrawn!");
        } catch (error) {
            console.error("Error claiming rewards:", error);
            const withdrawalStatusElement = document.getElementById("withdrawalStatus");
            if (withdrawalStatusElement) {
                withdrawalStatusElement.textContent = `Error: ${error.message}`;
            }
            alert("Failed to claim rewards: " + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function claimWelcomeBonus() {
        if (!account || !contract) return alert("Connect wallet first!");
        if (playerData.hasClaimedWelcomeBonus) return alert("Bonus already claimed!");
        try {
            showLoading(true);
            const tx = await contract.claimWelcomeBonus({ gasLimit: 500000 });
            await tx.wait();
            playerData.hasClaimedWelcomeBonus = true;
            const welcomeBonus = 100;
            playerData.totalRewards = (playerData.totalRewards || 0) + welcomeBonus;
            playerData.pendingRewards = (playerData.pendingRewards || 0) + welcomeBonus;
            await loadPlayerHistory();
            updatePlayerHistoryUI();
            alert(`Welcome bonus of ${welcomeBonus} BST claimed!`);
        } catch (error) {
            console.error("Error claiming welcome bonus:", error);
            alert("Failed to claim bonus: " + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function claimDailyLoginBonus() {
        if (!account || !contract) return alert("Connect wallet first!");
        try {
            showLoading(true);
            const tx = await contract.claimDailyLoginBonus({ gasLimit: 500000 });
            await tx.wait();
            const dailyBonus = 50;
            playerData.totalRewards = (playerData.totalRewards || 0) + dailyBonus;
            playerData.pendingRewards = (playerData.pendingRewards || 0) + dailyBonus;
            await loadPlayerHistory();
            updatePlayerHistoryUI();
            alert(`Daily login bonus of ${dailyBonus} BST claimed!`);
        } catch (error) {
            console.error("Error claiming daily login bonus:", error);
            alert("Failed to claim daily login bonus: " + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function stakeTokens() {
        if (!account || !contract) return alert("Connect wallet first!");
        const amount = parseFloat(document.getElementById("stakeAmount").value) || 0;
        const lockPeriod = parseInt(document.getElementById("lockPeriod").value);
        if (amount <= 0) return alert("Enter a valid amount!");
        try {
            showLoading(true);
            const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
            const signer = await provider.getSigner();
            const internalBalance = await contract.getInternalBalance(account);
            const amountInWei = ethers.utils.parseUnits(amount.toString(), 18);
            if (ethers.BigNumber.from(internalBalance).lt(amountInWei)) {
                alert("Insufficient internal balance to stake!");
                return;
            }
            const contractBal = await contract.contractBalance();
            if (ethers.BigNumber.from(contractBal).lt(amountInWei)) {
                alert("Contract does not have enough BST tokens!");
                return;
            }
            const tx = await contract.stakeTokens(amountInWei, lockPeriod, { gasLimit: 500000 });
            await tx.wait();
            playerData.pendingRewards = (playerData.pendingRewards || 0) - amount;
            if (lockPeriod === 0) {
                playerData.flexibleStakeBalance = (playerData.flexibleStakeBalance || 0) + amount;
            } else {
                playerData.lockedStakeBalances[lockPeriod] = (playerData.lockedStakeBalances[lockPeriod] || 0) + amount;
                playerData.lockedStakeStartTimes[lockPeriod] = Date.now() / 1000;
            }
            playerData.stakeHistory.push({
                type: "Stake",
                amount: amount,
                lockPeriod: lockPeriod,
                timestamp: Date.now(),
                source: "Internal Balance"
            });
            await loadPlayerHistory();
            updatePlayerHistoryUI();
            alert(`${amount} BST staked successfully from internal balance!`);
            document.getElementById("stakeAmount").value = "";
        } catch (error) {
            console.error("Error staking tokens:", error);
            alert("Failed to stake: " + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function stakeTokensFromWallet() {
        if (!account || !contract) return alert("Connect wallet first!");
        const amount = parseFloat(document.getElementById("stakeAmount").value) || 0;
        const lockPeriod = parseInt(document.getElementById("lockPeriod").value);
        if (amount <= 0) return alert("Enter a valid amount!");
        try {
            showLoading(true);
            const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
            const signer = await provider.getSigner();
            const walletBalance = await contract.balanceOf(account);
            const amountInWei = ethers.utils.parseUnits(amount.toString(), 18);
            if (ethers.BigNumber.from(walletBalance).lt(amountInWei)) {
                alert("Insufficient wallet balance to stake!");
                return;
            }
            const contractBal = await contract.contractBalance();
            if (ethers.BigNumber.from(contractBal).lt(amountInWei)) {
                alert("Contract does not have enough BST tokens!");
                return;
            }
            await contract.transferToWallet(CONTRACT_ADDRESS, amountInWei, { gasLimit: 500000 });
            const tx = await contract.stakeTokens(amountInWei, lockPeriod, { gasLimit: 500000 });
            await tx.wait();
            playerData.walletBalance = Number(ethers.utils.formatUnits(await contract.balanceOf(account), 18));
            if (lockPeriod === 0) {
                playerData.flexibleStakeBalance = (playerData.flexibleStakeBalance || 0) + amount;
            } else {
                playerData.lockedStakeBalances[lockPeriod] = (playerData.lockedStakeBalances[lockPeriod] || 0) + amount;
                playerData.lockedStakeStartTimes[lockPeriod] = Date.now() / 1000;
            }
            playerData.stakeHistory.push({
                type: "Stake",
                amount: amount,
                lockPeriod: lockPeriod,
                timestamp: Date.now(),
                source: "Wallet"
            });
            await loadPlayerHistory();
            updatePlayerHistoryUI();
            alert(`${amount} BST staked successfully from wallet!`);
            document.getElementById("stakeAmount").value = "";
        } catch (error) {
            console.error("Error staking tokens from wallet:", error);
            alert("Failed to stake from wallet: " + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function unstakeTokens() {
        if (!account || !contract) return alert("Connect wallet first!");
        const amount = parseFloat(document.getElementById("unstakeAmount").value) || 0;
        const lockPeriod = parseInt(document.getElementById("unlockPeriod").value);
        if (amount <= 0) return alert("Enter a valid amount!");
        try {
            showLoading(true);
            const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
            const signer = await provider.getSigner();
            const amountInWei = ethers.utils.parseUnits(amount.toString(), 18);
            const tx = await contract.unstakeTokens(amountInWei, lockPeriod, { gasLimit: 500000 });
            await tx.wait();
            if (lockPeriod === 0) {
                playerData.flexibleStakeBalance = (playerData.flexibleStakeBalance || 0) - amount;
            } else {
                playerData.lockedStakeBalances[lockPeriod] = (playerData.lockedStakeBalances[lockPeriod] || 0) - amount;
            }
            await contract.transferFromInternalToWallet(account, amountInWei, { gasLimit: 500000 });
            playerData.walletBalance = Number(ethers.utils.formatUnits(await contract.balanceOf(account), 18));
            playerData.stakeHistory.push({
                type: "Unstake",
                amount: amount,
                lockPeriod: lockPeriod,
                timestamp: Date.now(),
                destination: "Wallet"
            });
            await loadPlayerHistory();
            updatePlayerHistoryUI();
            alert(`${amount} BST unstaked successfully and transferred to wallet!`);
            document.getElementById("unstakeAmount").value = "";
        } catch (error) {
            console.error("Error unstaking tokens:", error);
            alert("Failed to unstake: " + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function joinCompetition() {
        if (!account || !contract) return alert("Connect wallet first!");
        try {
            showLoading(true);
            const tx = await contract.joinCompetition({ gasLimit: 500000 });
            await tx.wait();
            await loadPlayerHistory();
            updatePlayerHistoryUI();
            alert("Joined competition successfully!");
        } catch (error) {
            console.error("Error joining competition:", error);
            alert("Failed to join competition: " + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function purchaseBooster() {
        if (!account || !contract) return alert("Connect wallet first!");
        const durationDays = parseInt(document.getElementById("boosterDuration").value) || 0;
        const multiplier = parseInt(document.getElementById("boosterMultiplier").value) || 0;
        if (durationDays <= 0 || multiplier < 2 || multiplier > 5) return alert("Enter valid duration (1-30 days) and multiplier (2-5)!");
        try {
            showLoading(true);
            const tx = await contract.purchaseBooster(durationDays, multiplier, { gasLimit: 500000 });
            await tx.wait();
            await loadPlayerHistory();
            updatePlayerHistoryUI();
            alert(`Booster purchased: ${multiplier}x for ${durationDays} days!`);
            document.getElementById("boosterDuration").value = "";
            document.getElementById("boosterMultiplier").value = "";
        } catch (error) {
            console.error("Error purchasing booster:", error);
            alert("Failed to purchase booster: " + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function transferToWallet() {
        if (!account || !contract) return alert("Connect wallet first!");
        const toAddress = document.getElementById("transferAddress").value;
        const amount = parseFloat(document.getElementById("transferAmount").value) || 0;
        if (!ethers.utils.isAddress(toAddress)) return alert("Enter a valid recipient address!");
        if (amount <= 0) return alert("Enter a valid amount!");
        try {
            showLoading(true);
            const amountInWei = ethers.utils.parseUnits(amount.toString(), 18);
            const tx = await contract.transferToWallet(toAddress, amountInWei, { gasLimit: 500000 });
            await tx.wait();
            playerData.walletBalance = Number(ethers.utils.formatUnits(await contract.balanceOf(account), 18));
            await loadPlayerHistory();
            updatePlayerHistoryUI();
            alert(`${amount} BST transferred to ${toAddress}!`);
            document.getElementById("transferAddress").value = "";
            document.getElementById("transferAmount").value = "";
        } catch (error) {
            console.error("Error transferring tokens:", error);
            alert("Failed to transfer tokens: " + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function transferFromInternalToWallet() {
        if (!account || !contract) return alert("Connect wallet first!");
        const toAddress = document.getElementById("transferInternalAddress").value;
        const amount = parseFloat(document.getElementById("transferInternalAmount").value) || 0;
        if (!ethers.utils.isAddress(toAddress)) return alert("Enter a valid recipient address!");
        if (amount <= 0) return alert("Enter a valid amount!");
        try {
            showLoading(true);
            const amountInWei = ethers.utils.parseUnits(amount.toString(), 18);
            const tx = await contract.transferFromInternalToWallet(toAddress, amountInWei, { gasLimit: 500000 });
            await tx.wait();
            playerData.pendingRewards = (playerData.pendingRewards || 0) - amount;
            await loadPlayerHistory();
            updatePlayerHistoryUI();
            alert(`${amount} BST transferred from internal balance to ${toAddress}!`);
            document.getElementById("transferInternalAddress").value = "";
            document.getElementById("transferInternalAmount").value = "";
        } catch (error) {
            console.error("Error transferring tokens from internal balance:", error);
            alert("Failed to transfer tokens: " + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function showRewardHistory() {
        if (!account || !contract) return alert("Connect wallet first!");
        try {
            showLoading(true);
            const rewards = await contract.getRewardHistory(account);
            playerData.rewardHistory = rewards.map(reward => ({
                amount: Number(ethers.utils.formatUnits(reward.amount, 18)),
                timestamp: Number(reward.timestamp) * 1000,
                rewardType: reward.rewardType,
                referee: reward.referee === ethers.constants.AddressZero ? "N/A" : reward.referee
            }));
            updatePlayerHistoryUI();
            localStorage.setItem("playerData", JSON.stringify(playerData));
            alert("Reward history refreshed!");
        } catch (error) {
            console.error("Error loading reward history:", error);
            alert("Failed to load reward history: " + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function refreshFeeHistory() {
        if (!account || !contract || !isOwner) return alert("Only the owner can view fee history!");
        try {
            showLoading(true);
            const fees = await contract.getFeeHistory(account);
            playerData.feeHistory = fees.map(fee => ({
                amount: Number(ethers.utils.formatUnits(fee.amount, 18)),
                from: fee.user,
                timestamp: Number(fee.timestamp) * 1000,
                type: fee.feeType
            }));
            updatePlayerHistoryUI();
            localStorage.setItem("playerData", JSON.stringify(playerData));
            alert("Fee history refreshed!");
        } catch (error) {
            console.error("Error loading fee history:", error);
            alert("Failed to load fee history: " + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function withdrawCollectedFees() {
        if (!account || !contract || !isOwner) return alert("Only the owner can withdraw fees!");
        const secretKey = document.getElementById("secretKey").value;
        if (!secretKey) return alert("Please enter the secret key!");
        try {
            showLoading(true);
            const tx = await contract.withdrawCollectedFees(secretKey, { gasLimit: 500000 });
            await tx.wait();
            playerData.feeHistory.push({
                amount: Number(ethers.utils.formatUnits(await contract.collectedFees(), 18)),
                from: "Contract",
                timestamp: Date.now(),
                type: "WithdrawCollected"
            });
            await loadPlayerHistory();
            updatePlayerHistoryUI();
            alert("Collected fees withdrawn!");
            document.getElementById("secretKey").value = "";
        } catch (error) {
            console.error("Error withdrawing collected fees:", error);
            alert("Failed to withdraw fees: " + error.message);
        } finally {
            showLoading(false);
        }
    }

    function getReferralLink() {
        if (!account) return alert("Connect wallet first!");
        const baseUrl = window.location.origin + window.location.pathname;
        const referralLink = `${baseUrl}?ref=${account}`;
        navigator.clipboard.writeText(referralLink).then(() => {
            alert(`Referral link copied: ${referralLink}`);
        }).catch(err => {
            console.error("Failed to copy referral link:", err);
            alert("Failed to copy referral link. Please copy manually: " + referralLink);
        });
    }

    async function connectWallet() {
        if (!window.ethereum) return alert("Install MetaMask!");
        try {
            showLoading(true);
            const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
            await provider.send("eth_requestAccounts", []);
            const network = await provider.getNetwork();
            const chainId = network.chainId.toString();
            if (chainId !== TARGET_NETWORK_ID) {
                try {
                    await window.ethereum.request({
                        method: "wallet_switchEthereumChain",
                        params: [{ chainId: "0x61" }]
                    });
                } catch (switchError) {
                    if (switchError.code === 4902) {
                        await window.ethereum.request({
                            method: "wallet_addEthereumChain",
