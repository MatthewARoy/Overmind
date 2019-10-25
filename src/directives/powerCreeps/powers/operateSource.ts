import {profile} from "../../../profiler/decorator";
import {Power} from "./genericPower";
import {log} from "../../../console/log";

export const powerId = PWR_REGEN_SOURCE;

/**
 * An abstract class for encapsulating power creep power usage.
 */
@profile
export class OperateSource extends Power {

	constructor(powerCreep: PowerCreep, target?: RoomObject) {
		super(powerCreep, target);
	}

	operatePower() {
		if(this.powerCreep.room && this.powerCreep.room.controller && this.powerCreep.room.controller.isPowerEnabled){
			if (this.powerCreep.room && this.powerCreep.powers[PWR_REGEN_SOURCE] 
				&& (this.powerCreep.powers[PWR_REGEN_SOURCE].cooldown! | 0 ) < 40) {
				let sources = _.filter(this.powerCreep.room.sources, source => 
					(!source.effects || (source.effects && (!source.effects[0] || source.effects[0].ticksRemaining < 40))))
				let source = _.first(sources);
				if(source) {
					this.powerCreep.moveTo(source, 
						{ maxRooms: 1,ignoreRoads: true, range: 1, swampCost: 1, reusePath: 0, visualizePathStyle: 
						{ lineStyle: "dashed", fill: 'yellow' } });
					this.powerCreep.usePower(powerId, source);
					return true;
				}
			}
		}
		return false;
	}
}