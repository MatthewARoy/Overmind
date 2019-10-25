import {profile} from "../../../profiler/decorator";
import {Power} from "./genericPower";
import {log} from "../../../console/log";

export const powerId = PWR_GENERATE_OPS;

/**
 * An abstract class for encapsulating power creep power usage.
 */
@profile
export class GenerateOps extends Power {

	constructor(powerCreep: PowerCreep, target?: RoomObject) {
		super(powerCreep, target);
	}

	operatePower() {
		if (this.powerCreep.carry.ops && this.powerCreep.carry.ops > (this.powerCreep.carryCapacity * 0.9)) {
			const storage = this.powerCreep.room!.storage;
			if (!storage) {
				log.error(`Ops power creep with no storage`);
				return false;
			}
			else {
				this.powerCreep.moveTo(storage, 
					{ ignoreRoads: true, range: 1, swampCost: 1, reusePath: 0, visualizePathStyle: 
					{ lineStyle: "dashed", fill: 'yellow' } });
				this.powerCreep.transfer(storage, RESOURCE_OPS, this.powerCreep.carry.ops - 200);
				return true;
			}
		}
		else if (this.powerCreep.room && this.powerCreep.powers[PWR_GENERATE_OPS] 
			&& this.powerCreep.powers[PWR_GENERATE_OPS].cooldown == 0) {
			this.powerCreep.usePower(powerId);
			return true;
		}
		return false;
	}
}