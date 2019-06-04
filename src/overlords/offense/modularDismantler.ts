import {CombatSetups, Roles} from '../../creepSetups/setups';
import {DirectiveModularDismantler} from '../../directives/offense/modularDismantler';
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
 *  Destroyer overlord - spawns attacker/healer pairs for combat within a hostile room
 */
@profile
export class ModularDismantlerOverlord extends Overlord {

	directive: DirectiveModularDismantler;
	dismantlers: CombatZerg[];

	static settings = {
		retreatHitsPercent : 0.85,
		reengageHitsPercent: 0.95,
	};

	constructor(directive: DirectiveModularDismantler, priority = OverlordPriority.offense.modularDismantler) {
		super(directive, 'modularDismantler', priority);
		this.directive = directive;
		this.dismantlers = this.combatZerg(Roles.modularDismantler, {
			notifyWhenAttacked: false,
			boostWishlist     : [boostResources.work[3], boostResources.tough[3], boostResources.move[3]]
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

	private dismantleActions(dismantler: CombatZerg): void {
		const target = this.findTarget(dismantler);
		if (target) {
			if (dismantler.pos.isNearTo(target)) {
				dismantler.dismantle(<Structure>target);
			} else {
				Movement.goTo(dismantler,target);
			}
		}
	}

	private handleSquad(dismantler: CombatZerg): void {
		if (!dismantler.inSameRoomAs(this)) {
			Movement.goToRoom(dismantler,this.pos.roomName);
		} else {
			this.dismantleActions(dismantler);
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

		const attackerSetup = this.canBoostSetup(CombatSetups.modularDismantler.boosted_T3) ? CombatSetups.modularDismantler.boosted_T3
																				  : CombatSetups.zerglings.default;
		this.wishlist(amount, attackerSetup);
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
	}
	
}
