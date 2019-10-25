import {profile} from "../../../profiler/decorator";
import {Power} from "./genericPower";
import {log} from "../../../console/log";

export const powerId = PWR_OPERATE_SPAWN;

/**
 * An abstract class for encapsulating power creep power usage.
 */
@profile
export class OperateSpawn extends Power {

	constructor(powerCreep: PowerCreep, target?: RoomObject) {
		super(powerCreep, target);
	}

	operatePower() { 
		if(this.powerCreep.room && this.powerCreep.room.controller && this.powerCreep.room.controller.isPowerEnabled) {
			if (this.powerCreep.room && this.powerCreep.carry.ops && this.powerCreep.carry.ops >= 100 
				&& Memory.colonies[this.powerCreep.room.name].hatchery.stats.uptime > 0.9 
				&& this.powerCreep.powers[PWR_OPERATE_SPAWN] && (this.powerCreep.powers[PWR_OPERATE_SPAWN].cooldown || 0) < 25) {
				const spawns = _.filter(this.powerCreep.room.spawns, 
								spawn => (!spawn.effects || (spawn.effects && (!spawn.effects[0] || spawn.effects[0].ticksRemaining < 25))))
				const spawn = _.first(spawns);
				if(spawn) {
					this.powerCreep.moveTo(spawn, { ignoreRoads: true, range: 1, swampCost: 1, reusePath: 0, visualizePathStyle: 
					{ lineStyle: "dashed", fill: 'yellow' } });
					this.powerCreep.usePower(powerId, spawn);
					return true;
				}
			}
		}
		return false;
	}
}
