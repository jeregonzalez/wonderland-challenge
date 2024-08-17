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
exports.handler = void 0;
const ethers_1 = require("ethers");
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const sequencer_monitor_1 = require("./repositories/sequencer-monitor");
const sequencer_monitor_2 = require("./services/sequencer-monitor");
// Initialize resources
const provider = new ethers_1.ethers.JsonRpcProvider(process.env.RPC_NODE_URL, undefined, { batchMaxCount: 5 });
const docClient = new aws_sdk_1.default.DynamoDB.DocumentClient({
    endpoint: process.env.DYNAMODB_ENDPOINT_URL,
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});
const ddbSequencerMonitorRepository = new sequencer_monitor_1.DDBSequencerMonitorRepository(process.env.SEQUENCER_ADDRESS, docClient);
const sequencerMonitor = new sequencer_monitor_2.SequencerMonitor(provider, process.env.SEQUENCER_ADDRESS, ddbSequencerMonitorRepository);
const handler = (event) => __awaiter(void 0, void 0, void 0, function* () {
    yield sequencerMonitor.monitorUnworkableJobs(event.blockNumber, Number(process.env.CONSEQUENT_BLOCKS_LIMIT));
});
exports.handler = handler;
