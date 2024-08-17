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
exports.DDBSequencerMonitorRepository = void 0;
class DDBSequencerMonitorRepository {
    constructor(sequencerAddress, docClient) {
        this.sequencerAddress = sequencerAddress;
        this.docClient = docClient;
        this.tableName = "consequent-workable-blocks";
    }
    getConsequentWorkableBlocks() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const params = {
                TableName: this.tableName,
                Key: { sequencer_address: this.sequencerAddress },
            };
            const result = yield this.docClient.get(params).promise();
            return (_b = (_a = result.Item) === null || _a === void 0 ? void 0 : _a.consequent_workable_blocks) !== null && _b !== void 0 ? _b : {};
        });
    }
    setConsequentWorkableBlocks(consequentWorkableBlocks) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = {
                TableName: this.tableName,
                Item: {
                    sequencer_address: this.sequencerAddress,
                    consequent_workable_blocks: consequentWorkableBlocks,
                },
            };
            yield this.docClient.put(params).promise();
        });
    }
}
exports.DDBSequencerMonitorRepository = DDBSequencerMonitorRepository;
