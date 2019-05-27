import {CombatSetups, Roles} from '../../creepSetups/setups';
import {DirectivePairDestroy} from '../../directives/offense/pairDestroy';
import {DirectiveTargetSiege} from '../../directives/targeting/siegeTarget';
import {CombatIntel} from '../../intel/CombatIntel';
import {RoomIntel} from '../../intel/RoomIntel';
import {Movement} from '../../movement/Movement';
import {OverlordPriority} from '../../priorities/priorities_overlords';
import {profile} from '../../profiler/decorator';
import {boostResources} from '../../resources/map_resources';
import {CombatTargeting} from '../../targeting/CombatTargeting';
import {CombatZerg} from '../../zerg/CombatZerg';
import {Overlord} from '../Overlord';

/**
 *  Dismantler overlord - spawns dismantler/healer pairs for combat within a hostile room
 */
@profile
export class PairDismantleOverlord extends Overlord {

	directive: DirectivePairDestroy;
	dismantlers: CombatZerg[];
	healers: CombatZerg[];

	static settings = {
		retreatHitsPercent : 0.85,
		reengageHitsPercent: 0.95,
	};

	constructor(directive: DirectivePairDestroy, priority = OverlordPriority.offense.siege) {
		super(directive, 'combatDismantle', priority);
		this.directive = directive;
		this.dismantlers = this.combatZerg(Roles.dismantler, {
			notifyWhenAttacked: false,
			boostWishlist     : [boostResources.tough[3], boostResources.dismantle[3],
				boostResources.ranged_attack[3], boostResources.move[3],]
		});
		this.healers = this.combatZerg(Roles.healer, {
			notifyWhenAttacked: false,
			boostWishlist     : [boostResources.tough[3], boostResources.heal[3], boostResources.move[3],]
		});
	}

	private findTarget(dismantler: CombatZerg): Creep | Structure | undefined {
		if (this.room) {
			// Prioritize specifically targeted structures first
			const targetingDirectives = DirectiveTargetSiege.find(this.room.flags) as DirectiveTargetSiege[];
			const targetedStructures = _.compact(_.map(targetingDirectives,
													 directive => directive.getTarget())) as Structure[];
			if (targetedStructures.length > 0) {
				return CombatTargeting.findClosestReachable(dismantler.pos, targetedStructures);
			} else {
				// Target nearby hostile structures
				const structureTarget = CombatTargeting.findClosestPrioritizedStructure(dismantler);
				if (structureTarget) return structureTarget;
			}
		}
	}

	private dismantleActions(dismantler: CombatZerg, healer: CombatZerg): void {
		const target = this.findTarget(dismantler);
		if (target) {
			if (!dismantler.pos.isNearTo(target)) {
				Movement.pairwiseMove(dismantler, healer, target);
			}
			const isCreepTarget = target instanceof Creep;
			dismantler.autoRADismantle(isCreepTarget ? [target as Creep] : undefined,
				!isCreepTarget ? [target as Structure] : undefined);
		}
	}

	private handleSquad(dismantler: CombatZerg): void {
		const healer = dismantler.findPartner(this.healers);
		// Case 1: you don't have an active healer
		if (!healer || healer.spawning || healer.needsBoosts) {
			// Wait near the colony controller if you don't have a healer
			if (dismantler.pos.getMultiRoomRangeTo(this.colony.controller.pos) > 5) {
				dismantler.goTo(this.colony.controller, {range: 5});
			} else {
				dismantler.park();
			}
		}
		// Case 2: you have an active healer
		else {
			// Activate retreat condition if necessary
			// Handle recovery if low on HP
			if (dismantler.needsToRecover(PairDismantleOverlord.settings.retreatHitsPercent) ||
				healer.needsToRecover(PairDismantleOverlord.settings.retreatHitsPercent)) {
				// Healer leads retreat to fallback position
				Movement.pairwiseMove(healer, dismantler, CombatIntel.getFallbackFrom(this.directive.pos));
			} else {
				// Move to room and then perform attacking actions
				if (!dismantler.inSameRoomAs(this)) {
					Movement.pairwiseMove(dismantler, healer, this.pos);
				} else {
					this.dismantleActions(dismantler, healer);
				}
			}
		}
	}

	private handleHealer(healer: CombatZerg): void {
		// If there are no hostiles in the designated room, run medic actions
		if (this.room && this.room.hostiles.length == 0 && this.room.hostileStructures.length == 0) {
			healer.doMedicActions(this.room.name);
			return;
		}
		const dismantler = healer.findPartner(this.dismantlers);
		// Case 1: you don't have an dismantler partner
		if (!dismantler || dismantler.spawning || dismantler.needsBoosts) {
			if (healer.hits < healer.hitsMax) {
				healer.heal(healer);
			}
			// Wait near the colony controller if you don't have an dismantler
			if (healer.pos.getMultiRoomRangeTo(this.colony.controller.pos) > 5) {
				healer.goTo(this.colony.controller, {range: 5});
			} else {
				healer.park();
			}
		}
		// Case 2: you have an dismantler partner
		else {
			if (dismantler.hitsMax - dismantler.hits > healer.hitsMax - healer.hits) {
				healer.heal(dismantler);
			} else {
				healer.heal(healer);
			}
		}
	}

	init() {
		let amount;
		if (this.directive.memory.amount) {
			amount = this.directive.memory.amount;
		} else {
			amount = 1;
		}

		if (RoomIntel.inSafeMode(this.pos.roomName)) {
			amount = 0;
		}

		const dismantlerPriority = this.dismantlers.length < this.healers.length ? this.priority - 0.1 : this.priority + 0.1;
		const dismantlerSetup = this.canBoostSetup(CombatSetups.dismantlers.rangedDismantle_boosted_T3) ? CombatSetups.dismantlers.rangedDismantle_boosted_T3
																				  : CombatSetups.dismantlers.default;
		this.wishlist(amount, dismantlerSetup, {priority: dismantlerPriority});

		const healerPriority = this.healers.length < this.dismantlers.length ? this.priority - 0.1 : this.priority + 0.1;
		const healerSetup = this.canBoostSetup(CombatSetups.healers.boosted_T3) ? CombatSetups.healers.boosted_T3
																			  : CombatSetups.healers.default;
		this.wishlist(amount, healerSetup, {priority: healerPriority});
	}

	run() {
		for (const dismantler of this.dismantlers) {
			// Run the creep if it has a task given to it by something else; otherwise, proceed with non-task actions
			if (dismantler.hasValidTask) {
				dismantler.run();
			} else {
				if (dismantler.needsBoosts) {
					this.handleBoosting(dismantler);
				} else {
					this.handleSquad(dismantler);
				}
			}
		}

		for (const healer of this.healers) {
			if (healer.hasValidTask) {
				healer.run();
			} else {
				if (healer.needsBoosts) {
					this.handleBoosting(healer);
				} else {
					this.handleHealer(healer);
				}
			}
		}
	}
}
