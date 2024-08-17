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
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleConsecutiveWorkableBlocks = exports.getWorkableStatuses = exports.getJobAddresses = void 0;
const getJobAddresses = (sequencerContract) => __awaiter(void 0, void 0, void 0, function* () {
    const numJobs = yield sequencerContract.numJobs();
    const jobAddresses = [];
    for (let i = 0; i < numJobs; i++) {
        const jobAddress = yield sequencerContract.jobAt(i);
        jobAddresses.push(jobAddress);
    }
    return jobAddresses;
});
exports.getJobAddresses = getJobAddresses;
const getWorkableStatuses = (network, jobAddresses, jobContracts) => __awaiter(void 0, void 0, void 0, function* () {
    const promises = jobAddresses.map((jobAddress) => jobContracts[jobAddress].workable(network));
    return yield Promise.all(promises);
});
exports.getWorkableStatuses = getWorkableStatuses;
const handleConsecutiveWorkableBlocks = (consecutiveWorkableBlocks, jobAddress, network, blockNumber, canWork) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const key = `${jobAddress}-${network}`;
    if (canWork === true) {
        consecutiveWorkableBlocks[key] = ((_a = consecutiveWorkableBlocks[key]) !== null && _a !== void 0 ? _a : 0) + 1;
        if (consecutiveWorkableBlocks[key] >= 10) {
            console.log(`Job ${jobAddress} on network ${network} has not been worked for 10 consecutive blocks`);
        }
    }
    else {
        if (consecutiveWorkableBlocks[key] > 0) {
            consecutiveWorkableBlocks[key] = 0;
        }
    }
});
exports.handleConsecutiveWorkableBlocks = handleConsecutiveWorkableBlocks;
