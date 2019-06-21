import {log} from '../../console/log';
import {Roles, Setups} from '../../creepSetups/setups';
import {DirectivePraiseRoom} from '../../directives/colony/praiseRoom';
import {Pathing} from '../../movement/Pathing';
import {OverlordPriority} from '../../priorities/priorities_overlords';
import {profile} from '../../profiler/decorator';
import {boostResources} from '../../resources/map_resources';
import {Tasks} from '../../tasks/Tasks';
import {Zerg} from '../../zerg/Zerg';
import {Overlord} from '../Overlord';

/**
 * Spawn pioneers - early workers which help to build a spawn in a new colony, then get converted to workers or drones
 */
@profile
export class PraisingOverlord extends Overlord {

	directive: DirectivePraiseRoom;
	upgraders: Zerg[];
	haulers: Zerg[];
	upgradeContrainer: StructureContainer | undefined;

	constructor(directive: DirectivePraiseRoom, priority = OverlordPriority.colonization.pioneer) {
		super(directive, 'praiser', priority);
		this.directive = directive;
		this.upgraders = this.zerg(Roles.upgrader, {
			boostWishlist     : [boostResources.upgrade[3], boostResources.move[3]]
		});
		this.haulers = this.zerg(Roles.transport);
	}

	refresh() {
		super.refresh();
	}

	init() {
		if(this.room && this.room.hostiles.length == 0) {
			this.wishlist(4, Setups.upgraders.default);
			if(!this.room.terminal) {
				this.wishlist(8, Setups.transporters.early);
			}
		}
	}

	private handleHauler(hauler: Zerg) {
		if (_.sum(hauler.carry) == 0) { // go back to colony to recharge
			if (!hauler.inSameRoomAs(this.colony)) {
				hauler.goTo(this.colony);
				return;
			}
			hauler.task = Tasks.recharge();
			return;
		} else {
			if (!hauler.inSameRoomAs(this.directive)) { // transport energy to praise new room
				hauler.goTo(this.directive);
				return;
			}
			
			if(this.room && this.room.controller && !this.upgradeContrainer) {
				this.upgradeContrainer = _.first(this.room.controller.pos.findInRange(this.room.containers,3));
			}
			const transferTarget = this.room!.terminal || this.room!.storage || this.upgradeContrainer;
			if(transferTarget) {
				hauler.task = Tasks.transferAll(transferTarget);
				return;
			}
		}
	}
	private handleUpgrader(upgrader: Zerg) {
		// recharge even if in colony room (assuming it got boosted move parts)
		if (_.sum(upgrader.carry) == 0) {
			upgrader.task = Tasks.recharge();
			return;
		} 

		if (!upgrader.inSameRoomAs(this.directive)) {
			upgrader.goTo(this.directive);
			return;
		} else {
			const csites = _.filter(this.room!.constructionSites,csite => 
				csite.structureType != STRUCTURE_WALL &&
				csite.structureType != STRUCTURE_ROAD &&
				csite.structureType != STRUCTURE_RAMPART);
			const target = 	_.first(csites);
			if(target) {
				upgrader.task = Tasks.build(target);
				return;
			}

			if(this.room && this.room.controller) {
				upgrader.task = Tasks.upgrade(this.room.controller);
				return;
			}
		}
	}		
	run() {
		this.autoRun(this.upgraders, upgrader => this.handleUpgrader(upgrader));
		this.autoRun(this.haulers, hauler => this.handleHauler(hauler));
	}
}

