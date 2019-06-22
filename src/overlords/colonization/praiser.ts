import {Roles, Setups} from '../../creepSetups/setups';
import {DirectivePraiseRoom} from '../../directives/colony/praiseRoom';
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
	supporters: Zerg[];
	upgradeContrainer: StructureContainer | undefined;

	constructor(directive: DirectivePraiseRoom, priority = OverlordPriority.praiseRoom.praiser) {
		super(directive, 'praiser', priority);
		this.directive = directive;
		this.upgraders = this.zerg(Roles.upgrader, {
			boostWishlist     : [boostResources.upgrade[3], boostResources.move[3]]
		});
		this.haulers = this.zerg(Roles.transport);
		this.supporters = this.zerg(Roles.queen);
	}

	refresh() {
		super.refresh();
	}

	init() {
		if(this.room && this.room.hostiles.length > 0) {
			return;
		}
		if(this.room && this.room.terminal) {
			this.wishlist(8, Setups.upgraders.default);
		} else {
			this.wishlist(4, Setups.upgraders.default);
			this.wishlist(8, Setups.transporters.early);
		}
		if(this.room && this.room.storage) {
			this.wishlist(1,Setups.queens.default);
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
			} else {
				if(this.pos.isWalkable) {
					hauler.task = Tasks.drop(this.pos);
				}
			}
		}
	}
	private handleSupporters(supporter: Zerg) {
		if (!supporter.inSameRoomAs(this.directive)) {
			supporter.goTo(this.directive);
			return;
		} 
		if (_.sum(supporter.carry) < supporter.carryCapacity) { // withdraw from storage/terminal
			if(this.room && this.room.terminal && this.room.terminal.energy) {
				supporter.task = Tasks.withdraw(this.room.terminal,RESOURCE_ENERGY);
				return;
			}
			if(this.room && this.room.storage && this.room.storage.energy) {
				supporter.task = Tasks.withdraw(this.room.storage,RESOURCE_ENERGY);
				return;
			}
			return;
		} else {
			if(this.room && this.room.controller && !this.upgradeContrainer) {
				this.upgradeContrainer = _.first(this.room.controller.pos.findInRange(this.room.containers,3));
			}
			if(this.upgradeContrainer) {
				if(_.sum(this.upgradeContrainer.store) < this.upgradeContrainer.storeCapacity) {
					supporter.task = Tasks.transferAll(this.upgradeContrainer);
					return;
				} else {
					supporter.task = Tasks.drop(this.upgradeContrainer.pos);
				}
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
		this.autoRun(this.supporters, supporter => this.handleSupporters(supporter));
	}
}

