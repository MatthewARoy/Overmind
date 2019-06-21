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
	pioneers: Zerg[];
	spawnSite: ConstructionSite | undefined;
	upgradeContrainer: StructureContainer | undefined;

	constructor(directive: DirectivePraiseRoom, priority = OverlordPriority.colonization.pioneer) {
		super(directive, 'praiser', priority);
		this.directive = directive;
		this.upgraders = this.zerg(Roles.upgrader, {
			boostWishlist     : [boostResources.upgrade[3], boostResources.move[3]]
		});
		this.haulers = this.zerg(Roles.transport);
		
		this.pioneers = this.zerg(Roles.pioneer);
		this.spawnSite = this.room ? _.filter(this.room.constructionSites,
											  s => s.structureType == STRUCTURE_SPAWN)[0] : undefined;
	}

	refresh() {
		super.refresh();
		this.spawnSite = this.room ? _.filter(this.room.constructionSites,
											  s => s.structureType == STRUCTURE_SPAWN)[0] : undefined;
	}

	init() {
		this.wishlist(4, Setups.upgraders.default);
		const targetRoom = Game.rooms[this.pos.roomName];
		if(targetRoom && targetRoom.controller && !targetRoom.terminal) {
			this.wishlist(4, Setups.transporters.early);
		}
		if(targetRoom && targetRoom.constructionSites.length > 0) {
			this.wishlist(4, Setups.pioneer);
		}
	}

	private findStructureBlockingController(pioneer: Zerg): Structure | undefined {
		const blockingPos = Pathing.findBlockingPos(pioneer.pos, pioneer.room.controller!.pos,
													_.filter(pioneer.room.structures, s => !s.isWalkable));
		if (blockingPos) {
			const structure = blockingPos.lookFor(LOOK_STRUCTURES)[0];
			if (structure) {
				return structure;
			} else {
				log.error(`${this.print}: no structure at blocking pos ${blockingPos.print}! (Why?)`);
			}
		}
	}

	private handlePioneer(pioneer: Zerg): void {
		// Ensure you are in the assigned room
		if (pioneer.room == this.room && !pioneer.pos.isEdge) {
			// Remove any blocking structures preventing claimer from reaching controller
			if (!this.room.my && this.room.structures.length > 0) {
				const dismantleTarget = this.findStructureBlockingController(pioneer);
				if (dismantleTarget) {
					pioneer.task = Tasks.dismantle(dismantleTarget);
					return;
				}
			}
			// Build and recharge
			if (pioneer.carry.energy == 0) {
				pioneer.task = Tasks.recharge();
			} else if (this.room && this.room.controller &&
					   (this.room.controller.ticksToDowngrade < 2500 || !this.spawnSite) &&
					   !(this.room.controller.upgradeBlocked > 0)) {
				// Save controller if it's about to downgrade or if you have nothing else to do
				pioneer.task = Tasks.upgrade(this.room.controller);
			} else if (this.spawnSite) {
				pioneer.task = Tasks.build(this.spawnSite);
			}
		} else {
			// pioneer.task = Tasks.goTo(this.pos);
			pioneer.goTo(this.pos, {ensurePath: true, avoidSK: true, waypoints: this.directive.waypoints});
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
			const targetRoom = Game.rooms[this.pos.roomName];
			if(targetRoom && targetRoom.controller && !this.upgradeContrainer) {
				this.upgradeContrainer = _.first(targetRoom.controller.pos.findInRange(targetRoom.containers,3));
			}
			const transferTarget = targetRoom.terminal || targetRoom.storage || this.upgradeContrainer;
			if(transferTarget) {
				hauler.task = Tasks.transferAll(transferTarget);
				return;
			}
		}
	}
	private handleUpgrader(upgrader: Zerg) {
		if (!upgrader.inSameRoomAs(this.directive)) {
			upgrader.goTo(this.directive);
			return;
		}
		if (_.sum(upgrader.carry) == 0) {
			upgrader.task = Tasks.recharge();
			return;
		} else {
			if(this.room && this.room.controller) {
				upgrader.task = Tasks.upgrade(this.room.controller);
			}
		}
	}		
	run() {
		this.autoRun(this.upgraders, upgrader => this.handleUpgrader(upgrader));
		this.autoRun(this.haulers, hauler => this.handleHauler(hauler));
		this.autoRun(this.pioneers, pioneer => this.handlePioneer(pioneer));
	}
}

