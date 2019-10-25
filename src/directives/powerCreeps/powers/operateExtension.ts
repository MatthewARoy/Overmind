import {profile} from "../../../profiler/decorator";
import {Power} from "./genericPower";
import {log} from "../../../console/log";

export const powerId = PWR_OPERATE_EXTENSION;

/**
 * An abstract class for encapsulating power creep power usage.
 */
@profile
export class OperateExtension extends Power {

	constructor(powerCreep: PowerCreep, target?: RoomObject) {
		super(powerCreep, target);
	}

	operatePower() {
		if(this.powerCreep.room && this.powerCreep.room.controller && this.powerCreep.room.controller.isPowerEnabled) {
			if (this.powerCreep.carry.ops && this.powerCreep.carry.ops > 2 && this.powerCreep.room
				&& this.powerCreep.room.energyAvailable < this.powerCreep.room.energyCapacityAvailable * 0.5
				&& this.powerCreep.powers[PWR_OPERATE_EXTENSION] && this.powerCreep.powers[PWR_OPERATE_EXTENSION].cooldown == 0) {
				const terminal = this.powerCreep.room.storage;
				if (!terminal) {
					log.error(`Ops power creep with no storage`);
					return false;
				}
				else {
					this.powerCreep.moveTo(terminal, 
						{ ignoreRoads: true, range: 1, swampCost: 1, reusePath: 0, visualizePathStyle: 
						{ lineStyle: "dashed", fill: 'yellow' } });
					this.powerCreep.usePower(powerId, terminal);
					return true;
				}
			}
		}
		return false;
	}
}