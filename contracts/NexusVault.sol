// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract NexusVault {
    // 🏆 OFFICIAL MNEE CONTRACT ADDRESS (ETHEREUM MAINNET)
    address constant MNEE_ADDRESS = 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF;
    
    IERC20 public mneeToken;
    address public admin;       
    address public aiAgent;     

    uint256 public dailyLimit;           
    uint256 public currentDaySpend;      
    uint256 public lastResetTimestamp;   
    
    event PaymentExecuted(address indexed recipient, uint256 amount, string invoiceRef);

    constructor(address _aiAgent, uint256 _dailyLimit) {
        admin = msg.sender;
        aiAgent = _aiAgent;
        dailyLimit = _dailyLimit;
        mneeToken = IERC20(MNEE_ADDRESS);
        lastResetTimestamp = block.timestamp;
    }

    function payInvoice(address _recipient, uint256 _amount, string calldata _invoiceRef) external {
        require(msg.sender == aiAgent || msg.sender == admin, "Nexus: Access Denied");

        // Reset daily limit if 24 hours have passed
        if (block.timestamp > lastResetTimestamp + 1 days) {
            currentDaySpend = 0;
            lastResetTimestamp = block.timestamp;
        }

        // Check Limit (Skip for Admin)
        if (msg.sender == aiAgent) {
            require(currentDaySpend + _amount <= dailyLimit, "Nexus: Daily limit exceeded");
            currentDaySpend += _amount;
        }

        require(mneeToken.transfer(_recipient, _amount), "Nexus: MNEE Transfer failed");
        emit PaymentExecuted(_recipient, _amount, _invoiceRef);
    }
}