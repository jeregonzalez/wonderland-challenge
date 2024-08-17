"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SequencerMonitor = void 0;
const ethers_1 = require("ethers");
const sequencer_abi_json_1 = __importDefault(require("../abis/sequencer-abi.json"));
const workable_abi_json_1 = __importDefault(require("../abis/workable-abi.json"));
class SequencerMonitor {
    constructor(ethersProvider, sequencerAddress, sequencerMonitorRepository) {
        this.ethersProvider = ethersProvider;
        this.sequencerAddress = sequencerAddress;
        this.sequencerMonitorRepository = sequencerMonitorRepository;
        this.jobContracts = {};
        this.sequencerContract = new ethers_1.ethers.Contract(this.sequencerAddress, sequencer_abi_json_1.default, this.ethersProvider);
    }
    monitorUnworkableJobs(blockNumber, consequentBlocksLimit) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Getting job addresses...");
            const jobAddresses = yield this.getJobAddresses(blockNumber);
            console.log("Getting networks...");
            const networks = yield this.getNetworks(blockNumber);
            console.log("Getting workable statuses...");
            const workableStatusesByNetwork = yield this.getWorkableStatusesByNetwork(blockNumber, networks, jobAddresses);
            console.log("Handling consecutive workable blocks...");
            yield this.handleConsecutiveWorkableBlocks(workableStatusesByNetwork, consequentBlocksLimit);
        });
    }
    getJobAddresses(blockNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const numJobs = yield this.sequencerContract.numJobs({
                blockTag: blockNumber,
            });
            const promises = Array.from({ length: Number(numJobs) }, (_, i) => this.sequencerContract.jobAt(i, { blockTag: blockNumber }));
            return yield Promise.all(promises);
        });
    }
    getNetworks(blockNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const numNetworks = yield this.sequencerContract.numNetworks({
                blockTag: blockNumber,
            });
            const promises = Array.from({ length: Number(numNetworks) }, (_, i) => this.sequencerContract.networkAt(i, { blockTag: blockNumber }));
            return yield Promise.all(promises);
        });
    }
    getWorkableStatuses(blockNumber, network, jobAddresses) {
        return __awaiter(this, void 0, void 0, function* () {
            const promises = jobAddresses.map((jobAddress) => {
                var _a;
                var _b;
                (_a = (_b = this.jobContracts)[jobAddress]) !== null && _a !== void 0 ? _a : (_b[jobAddress] = new ethers_1.ethers.Contract(jobAddress, workable_abi_json_1.default, this.ethersProvider));
                return this.jobContracts[jobAddress].workable(network, {
                    blockTag: blockNumber,
                });
            });
            const responses = yield Promise.all(promises);
            const workableStatuses = {};
            for (let i = 0; i < jobAddresses.length; i++) {
                workableStatuses[jobAddresses[i]] = responses[i][0];
            }
            return workableStatuses;
        });
    }
    getWorkableStatusesByNetwork(blockNumber, networks, jobAddresses) {
        return __awaiter(this, void 0, void 0, function* () {
            const promises = networks.map((network) => this.getWorkableStatuses(blockNumber, network, jobAddresses));
            const workableStatuses = yield Promise.all(promises);
            const workableStatusesByNetwork = {};
            for (let i = 0; i < networks.length; i++) {
                workableStatusesByNetwork[networks[i]] = workableStatuses[i];
            }
            return workableStatusesByNetwork;
        });
    }
    handleConsecutiveWorkableBlocks(workableStatusesByNetwork, consequentBlocksLimit) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const consequentWorkableBlocks = yield this.sequencerMonitorRepository.getConsequentWorkableBlocks();
            for (const network in workableStatusesByNetwork) {
                const workableStatuses = workableStatusesByNetwork[network];
                for (const jobAddress in workableStatuses) {
                    const networkJob = `${network}-${jobAddress}`;
                    const canWork = workableStatuses[jobAddress];
                    if (canWork === true) {
                        consequentWorkableBlocks[networkJob] =
                            ((_a = consequentWorkableBlocks[networkJob]) !== null && _a !== void 0 ? _a : 0) + 1;
                        if (consequentWorkableBlocks[networkJob] >= consequentBlocksLimit) {
                            console.log(`Job ${jobAddress} on network ${network} has not been worked for 10 consecutive blocks`);
                        }
                    }
                    else {
                        if (consequentWorkableBlocks[networkJob] > 0) {
                            consequentWorkableBlocks[networkJob] = 0;
                        }
                    }
                }
            }
            yield this.sequencerMonitorRepository.setConsequentWorkableBlocks(consequentWorkableBlocks);
        });
    }
}
exports.SequencerMonitor = SequencerMonitor;
