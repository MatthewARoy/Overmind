import {CreepSetup} from '../../creepSetups/CreepSetup';
import {CombatSetups, Roles} from '../../creepSetups/setups';
import {DirectiveInvasionDefense} from '../../directives/defense/invasionDefense';
import {CombatIntel} from '../../intel/CombatIntel';
import {OverlordPriority} from '../../priorities/priorities_overlords';
import {profile} from '../../profiler/decorator';
import {boostResources} from '../../resources/map_resources';
import {CombatZerg} from '../../zerg/CombatZerg';
import {CombatOverlord} from '../CombatOverlord';
import {DirectiveStronghold} from "../../directives/situational/stronghold";
import {Visualizer} from "../../visuals/Visualizer";
import index from "rollup-plugin-typescript2";
import {log} from "../../console/log";
import {derefCoords, getCacheExpiration, getPosFromString} from "../../utilities/utils";



/**
 * Prioritized list of what order enemy structures should be attacked in
 */
export const StrongholdAttackPriorities: StructureConstant[] = [
	STRUCTURE_INVADER_CORE,
	STRUCTURE_TOWER,
	STRUCTURE_RAMPART,
	STRUCTURE_WALL,
];

/**
 * Spawns ranged attacker against stronghold
 */
@profile
export class StrongholdOverlord extends CombatOverlord {

	strongholdKillers: CombatZerg[];
	room: Room | undefined;
	directive: DirectiveStronghold;
	_target: RoomObject | null;
	_attackPos?: RoomPosition;

	static settings = {
		retreatHitsPercent : 0.85,
		reengageHitsPercent: 0.95,
	};

	constructor(directive: DirectiveStronghold,
				priority = OverlordPriority.defense.rangedDefense) {
		super(directive, 'stronghold', priority, 1);
		this.strongholdKillers = this.combatZerg(Roles.strongholdKiller, {
			notifyWhenAttacked: false,
			boostWishlist: [boostResources.tough[3], boostResources.ranged_attack[3],
					boostResources.heal[3], boostResources.move[3]]
		});
	}

	/**
	 * Returns [position, target] by searching for safe locations
	 * @param target
	 * @param range
	 * @param myCreep
	 */
	private findAttackingPositionAndTarget(target: Creep | Structure, range: number, myCreep: CombatZerg): {attackPos: RoomPosition, target: Creep | Structure} | undefined {
		log.info(`Finding attacking position in ${target.room} for ${this.print}`);
		if (!target.room || range == 0) {return;}

		// bug with containers
		let shootPositions = target.pos.getPositionsAtRange(range, false, false);

		// Index is range to avoid from
		let avoidLocs: RoomPosition[][] = Array.from({length: 5}, () => []);

		avoidLocs[1] = avoidLocs[1].concat(target.room.ramparts.map(rampart => rampart.pos));
		avoidLocs[4] = avoidLocs[4].concat(target.room.sources.map(s => s.pos));
		avoidLocs[4] = avoidLocs[4].concat(target.room.keeperLairs.map(s => s.pos));
		if (target.room.mineral) {avoidLocs[4] = avoidLocs[4].concat(target.room.mineral.pos)};

		// Array where first index is how many hostile locations there are
		let safeSpots: RoomPosition[][] = this.findSafeLocation(shootPositions, avoidLocs);
		_.forEach(safeSpots, (distanceArray, hostilesIndex) => distanceArray.forEach(spot => Visualizer.marker(spot, {color: StrongholdOverlord.numberToColor(hostilesIndex), frames: 2})));

		// If you can safely attack goal, do that
		if (safeSpots[0].length > 0) {
			const closestFirst = safeSpots[0].sort(((a, b) => this.bestRampartToAttackSortFunction(a, b, myCreep.pos)))
			return {attackPos: closestFirst[0], target: target};
		} else if (safeSpots[1].length > 0) {
			// Can't safely attack target, need to attack another position first
			let newTargets: RoomPosition[];
			let range1Spots = safeSpots[1];
			let ramparts = target.room!.ramparts;
			let posToRampartMap: Map<RoomPosition, StructureRampart[]> = new Map();
			for (let spot of range1Spots) {
				for (let rampart of ramparts) {
					if (rampart.pos.isNearTo(spot)) {
						let temp: StructureRampart[] | undefined = posToRampartMap.get(spot);
						posToRampartMap.set(spot, !!temp ? temp.concat([rampart]): [rampart]);
					}
				}
			}

			// Now select closest
			if (myCreep) {
				// TODO currently extra filtering, don't need from above
				let orderedByBest = Array.from(posToRampartMap.keys()).filter(p => posToRampartMap.get(p)
					&& posToRampartMap.get(p)!.length == 1).sort((a,b) => this.bestRampartToAttackSortFunction(a, b, myCreep.pos));
				console.log('sorted array is ' + orderedByBest)
				for (let pos of orderedByBest) {
					let res = this.findAttackingPositionAndTarget(posToRampartMap.get(pos)![0], range-1, myCreep);
					if (res) {
						return res;
					}
				}
			} else {
				for (let pos of posToRampartMap) {
					let res = this.findAttackingPositionAndTarget(pos[1][0]!, range-1, myCreep);
					if (res) {
						return res;
					}
				}
			}
		}
		return;
	}

	bestRampartToAttackSortFunction(element1: RoomPosition, element2: RoomPosition, currentPos: RoomPosition, /*map: Map<RoomPosition, StructureRampart[]>*/) {
		// const numRamparts1 = map.get(element1) == undefined ? 10 : map.get(element1)!.length;
		// const numRamparts2 = map.get(element2) == undefined ? 10 : map.get(element2)!.length;
		return element1.getRangeTo(currentPos) - element2.getRangeTo(currentPos); //+ (numRamparts1 - numRamparts2);
		// if (element.roomName == currentPos.roomName) {
		//
		// }
	}

	/**
	 * Returns double array of number of avoids per locations
	 * @param locations
	 * @param avoidLocationsAtDistance
	 */
	private findSafeLocation(locations: RoomPosition[], avoidLocationsAtDistance: RoomPosition[][]): RoomPosition[][] {
		// Index is number of hostiles present.
		const locationToHostilesMapping: RoomPosition[][] = Array.from({length: 8}, () => []);

		locations.forEach(loc => {
			let count = 0;
			avoidLocationsAtDistance.forEach((avoidArray, distance) => {
				avoidArray.forEach(avoidPos => {
					if (avoidPos.getRangeTo(loc) <= distance) {
						count++;
					}
				});
			});
			if (count < locationToHostilesMapping.length) {
				locationToHostilesMapping[count].push(loc);
			}
		});

		// // Should probably do cost matrix to avoid ramparts, wrote a getNearRampartsMatrix in pathing but need to use it
		return locationToHostilesMapping;
	}


	get target(): Creep | Structure | undefined {
		if (this.directive.memory.target && this.directive.memory.target.exp > Game.time) {
			const target = Game.getObjectById(this.directive.memory.target.id);
			if (target) {
				return target as Creep | Structure;
			}
		}
		// If nothing found
		delete this.directive.memory.target;
	}

	private get attackPos(): RoomPosition | undefined {
		if (this._attackPos) {
			return this._attackPos;
		}
		if (this.directive.memory.target && this.directive.memory.attackingPosition) {
			this._attackPos = getPosFromString(this.directive.memory.attackingPosition);
			return this._attackPos;
		}
	}

	private handleKiller(killer: CombatZerg): void {
		if (Game.time % 15 == 0) {
			log.info(`Stronghold Killer ${killer.print} for ${this.print} in room ${killer.room.print}`);
		}

		if (this.room && killer.pos.roomName == this.pos.roomName) {
			if (this.directive.core && !this.directive.memory.target) {
				let before = Game.cpu.getUsed();
				const targetingInfo = this.resetAttacking(this.directive.core, 3, killer);
				log.info(`CPU used for stronghold is ${Game.cpu.getUsed() - before}`);
			}
		}

		// TODO creep was an idiot and walked next to rampart moving to next attack position
		killer.heal(killer);

		if (killer.pos.roomName != this.pos.roomName) {
			killer.goToRoom(this.directive.pos.roomName);
		}
		if (killer.hits/killer.hitsMax < StrongholdOverlord.settings.retreatHitsPercent) {
			killer.flee([this.directive.pos].concat(killer.room.hostiles.map(sk => sk.pos)));
		}

		// Shoot nearby enemies before moving on
		const unprotectedHostiles = killer.room.hostiles.filter(hostile => hostile.pos.getRangeTo(killer.pos) <= 3 && !hostile.inRampart);
		if (unprotectedHostiles.length > 0) {
			killer.rangedAttack(unprotectedHostiles[0]);
			return;
		}
		if (this.directive.memory.attackingPosition) {
			let attackPos = getPosFromString(this.directive.memory.attackingPosition);
			// In room and in position
			if (!attackPos || !killer.pos.isEqualTo(attackPos)) {
				let avoids: RoomPosition[] = [];
				if (this.directive.room) {
					avoids = avoids.concat(_.flatten(this.directive.room.sourceKeepers.map(source => source.pos.getPositionsInRange(3, false, false))));
					avoids = avoids.concat(_.flatten(this.directive.room.ramparts.map(ramparts => ramparts.pos.neighbors)));
					if (this.directive.room.mineral) {
						avoids = avoids.concat(this.directive.room.mineral.pos.getPositionsInRange(4, false, false))
					}
					avoids.forEach(av => Visualizer.circle(av));
					killer.goTo(attackPos!, {obstacles: avoids});
				}
			}
		}

		if (killer.pos.roomName == this.directive.pos.roomName) {
			if (this.target) {
				let res = killer.rangedAttack(this.target);
				if (res == ERR_INVALID_TARGET) {

				}
			} else {
				killer.goTo(this.pos);
				killer.rangedMassAttack();
				//killer.autoCombat(this.directive.pos.roomName);
			}
		}
	}

	static numberToColor(number: number) {
		switch(number) {
			case 0: return 'green';
			case 1: return 'yellow';
			case 2: return 'orange';
			default: return 'red';
		}
	}

	init() {
		if (this.directive.memory.state >= 3) {
			return; // No need to spawn more
		}
		// log.info(`Setting up body type for ${this.print} with ${this.directive.memory.strongholdLevel}`);

		let setup;
		// TODO fix me for when strongholds typescript is out
		switch(this.directive.memory.strongholdLevel) {
			case 5:
				return; // Fuck this shit we out
			case 4:
				return;
				//setup = CombatSetups.strongholdKiller["4"];
				//break;
			case 3:
				setup = CombatSetups.strongholdKiller["3"];
				break;
			case 2:
				setup = CombatSetups.strongholdKiller["2"];
				break;
			case 1:
				setup = CombatSetups.strongholdKiller["1"];
				break;
			case 0:
				return; // Forget it, no need for the lil ones
			default:
				return;//setup = CombatSetups.strongholdKiller["3"];
		}

		if (!this.canBoostSetup(setup)) {
			// Need boosts
			return log.error(`Can't boost stronghold killer in ${this.print}!`);
		}

		this.wishlist(1, setup, {})
	}

	private resetAttacking(ultimateGoal: Creep | Structure, maxRange: number, myCreep: CombatZerg) {
		const targetingInfo = this.findAttackingPositionAndTarget(ultimateGoal, 3, myCreep);
		if (targetingInfo) {
			this.directive.target = targetingInfo.target;
			this.directive.memory.attackingPosition = targetingInfo.attackPos.name;
		}
		return targetingInfo;
	}

	run() {
		let avoids: RoomPosition[] = [];
		// if (this.directive.room) {
		// 	avoids = avoids.concat(_.flatten(this.directive.room.sources.map(source => source.pos.getPositionsInRange(4, false, false))));
		// 	avoids = avoids.concat(_.flatten(this.directive.room.ramparts.map(ramparts => ramparts.pos.neighbors)));
		// 	if (this.directive.room.mineral) {
		// 		avoids = avoids.concat(this.directive.room.mineral.pos.getPositionsInRange(4, false, false))
		// 	}
		// }
		// avoids.forEach(av => Visualizer.circle(av, 'blue'));
		//log.info(`Running stronghold overlord ${this.print}`);
		this.autoRun(this.strongholdKillers, killer => this.handleKiller(killer));
	}
}