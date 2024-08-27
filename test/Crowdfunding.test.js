const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Crowdfunding", function () {
  let Crowdfunding;
  let crowdfunding;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    Crowdfunding = await ethers.getContractFactory("Crowdfunding");
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the contract
    crowdfunding = await Crowdfunding.deploy();

    // Ensure the contract is fully deployed
    await crowdfunding.deployed();
  });

  it("Should create a campaign correctly", async function () {
    const title = "Save the Ocean";
    const description = "A campaign to clean up the ocean";
    const benefactor = addr1.address;
    const goal = ethers.utils.parseEther("10"); // 10 ETH
    const duration = 3600; // 1 hour

    // Create a campaign
    await crowdfunding.createCampaign(
      title,
      description,
      benefactor,
      goal,
      duration
    );

    // Retrieve the campaign data
    const campaign = await crowdfunding.campaigns(1);

    expect(campaign.title).to.equal(title);
    expect(campaign.description).to.equal(description);
    expect(campaign.benefactor).to.equal(benefactor);
    expect(campaign.goal).to.equal(goal);
    expect(campaign.deadline).to.be.above(0);
    expect(campaign.amountRaised).to.equal(0);
  });

  it("Should allow donations to a campaign", async function () {
    const title = "Save the Forest";
    const description = "A campaign to protect the forest";
    const benefactor = addr1.address;
    const goal = ethers.utils.parseEther("20"); // 20 ETH
    const duration = 3600; // 1 hour

    // Create a campaign
    await crowdfunding.createCampaign(
      title,
      description,
      benefactor,
      goal,
      duration
    );

    // Donate to the campaign
    const donationAmount = ethers.utils.parseEther("5"); // 5 ETH
    await crowdfunding.connect(addr2).donateToCampaign(1, {
      value: donationAmount,
    });

    const campaign = await crowdfunding.campaigns(1);
    expect(campaign.amountRaised).to.equal(donationAmount);
  });

  it("Should end a campaign and transfer funds if goal is met", async function () {
    const title = "Build a School";
    const description = "A campaign to build a school";
    const benefactor = addr1.address;
    const goal = ethers.utils.parseEther("5"); // 5 ETH
    const duration = 3600; // 1 hour

    // Create a campaign
    await crowdfunding.createCampaign(
      title,
      description,
      benefactor,
      goal,
      duration
    );

    // Donate to the campaign
    const donationAmount = ethers.utils.parseEther("5"); // 5 ETH
    await crowdfunding.connect(addr2).donateToCampaign(1, {
      value: donationAmount,
    });

    // Increase time to after the deadline
    await ethers.provider.send("evm_increaseTime", [duration]);
    await ethers.provider.send("evm_mine", []);

    // End the campaign
    await crowdfunding.endCampaign(1);

    // Check if the campaign has ended
    const campaign = await crowdfunding.campaigns(1);
    expect(campaign.ended).to.be.true;

    // Check if the funds were transferred to the benefactor
    const benefactorBalance = await ethers.provider.getBalance(benefactor);
    expect(benefactorBalance).to.be.above(ethers.utils.parseEther("10000")); // initial balance + donation
  });

  it("Should allow the owner to withdraw leftover funds", async function () {
    const initialOwnerBalance = await ethers.provider.getBalance(owner.address);

    // Create a campaign with a small goal
    await crowdfunding.createCampaign(
      "Test Campaign",
      "Testing withdrawals",
      addr1.address,
      ethers.utils.parseEther("1"),
      3600
    );

    // Donate more than the goal
    await crowdfunding.connect(addr2).donateToCampaign(1, {
      value: ethers.utils.parseEther("2"),
    });

    // End the campaign
    await ethers.provider.send("evm_increaseTime", [3600]);
    await ethers.provider.send("evm_mine", []);
    await crowdfunding.endCampaign(1);

    // Owner withdraws leftover funds
    await crowdfunding.withdrawLeftoverFunds();

    const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
    expect(finalOwnerBalance).to.be.above(initialOwnerBalance);
  });
});
