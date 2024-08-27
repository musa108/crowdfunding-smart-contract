// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Crowdfunding {
    struct Campaign {
        string title;
        string description;
        address payable benefactor;
        uint goal;
        uint deadline;
        uint amountRaised;
        bool ended;
    }

    mapping(uint => Campaign) public campaigns;
    uint public campaignCount;
    address public owner;

    event CampaignCreated(
        uint campaignId,
        string title,
        address benefactor,
        uint goal,
        uint deadline
    );
    event DonationReceived(uint campaignId, address donor, uint amount);
    event CampaignEnded(uint campaignId, uint amountRaised, bool goalMet);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function createCampaign(
        string memory _title,
        string memory _description,
        address payable _benefactor,
        uint _goal,
        uint _duration
    ) public {
        require(_goal > 0, "Goal should be greater than zero");

        campaignCount++;
        uint deadline = block.timestamp + _duration;

        campaigns[campaignCount] = Campaign({
            title: _title,
            description: _description,
            benefactor: _benefactor,
            goal: _goal,
            deadline: deadline,
            amountRaised: 0,
            ended: false
        });

        emit CampaignCreated(
            campaignCount,
            _title,
            _benefactor,
            _goal,
            deadline
        );
    }

    function donateToCampaign(uint _campaignId) public payable {
        Campaign storage campaign = campaigns[_campaignId];
        require(block.timestamp < campaign.deadline, "Campaign has ended");
        require(msg.value > 0, "Donation should be greater than zero");
        require(!campaign.ended, "Campaign has already ended");

        campaign.amountRaised += msg.value;

        emit DonationReceived(_campaignId, msg.sender, msg.value);
    }

    function endCampaign(uint _campaignId) public {
        Campaign storage campaign = campaigns[_campaignId];
        require(
            block.timestamp >= campaign.deadline,
            "Campaign is still ongoing"
        );
        require(!campaign.ended, "Campaign has already ended");

        campaign.ended = true;
        (bool success, ) = campaign.benefactor.call{
            value: campaign.amountRaised
        }("");
        require(success, "Transfer failed");

        emit CampaignEnded(
            _campaignId,
            campaign.amountRaised,
            campaign.amountRaised >= campaign.goal
        );
    }

    function withdrawLeftoverFunds() public onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}
