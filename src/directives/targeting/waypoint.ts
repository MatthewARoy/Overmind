import {AttackStructurePriorities} from '../../priorities/priorities_structures';
import {profile} from '../../profiler/decorator';
import {Visualizer} from '../../visuals/Visualizer';
import {Directive} from '../Directive';

/**
 * Waypoint for portal code
 */
@profile
export class DirectiveWaypoint extends Directive {

	static directiveName = 'waypoint';
	static color = COLOR_GREY;
	static secondaryColor = COLOR_BLUE;

	// Used for 2 directional travel
	previousWaypoint: string;
	nextWaypoint: string;

	// Creates a waypoint flag with previous and next, where previous is often spawning colony and
	// next is often target directive or portal on other side
	constructor(flag: Flag, previous?: string, next?: string) {
		super(flag);
		if (previous) { this.previousWaypoint = previous}
		if (next) { this.nextWaypoint = next}

		const portal = flag.pos.lookForStructure(STRUCTURE_PORTAL) as StructurePortal | undefined;
		// Set up portal with the chain of this directive
		if (portal && !previous) { this.setUpPortalPairing(portal)}
	}

	// Create directive on other side of portal
	setUpPortalPairing(portal: StructurePortal) {
		if (portal.destination instanceof RoomPosition) {
			const nextDirective = DirectiveWaypoint.create(portal.destination, this);
			if (typeof nextDirective == 'string') {
				this.nextWaypoint = nextDirective;
			}

		} else {
			// Handle intershard
		}
	}

	spawnMoarOverlords() {

	}

	init(): void {
	}

	run(): void {
	}

	visuals(): void {
		Visualizer.marker(this.pos, {color: 'blue'});
	}
}

