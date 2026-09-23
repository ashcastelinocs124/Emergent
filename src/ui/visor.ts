import type { WorldState } from '../shared/model';

export interface VisorTarget { id: string; label: string }
export interface Visor {
  sync(world: WorldState, target: VisorTarget | null): void;
  message(text: string, durationMs?: number): void;
}

export function createVisor(root: HTMLElement): Visor {
  const find = (id: string) => root.querySelector<HTMLElement>(`#${id}`)!;
  const airValue = find('air-value');
  const powerValue = find('power-value');
  const healthValue = find('health-value');
  const prompt = find('visor-prompt');
  let message = '';
  let messageUntil = 0;
  const resource = (name: 'air' | 'power' | 'health', value: number, label: HTMLElement) => {
    label.textContent = `${Math.round(value * 100)}%`;
    const element = root.querySelector<HTMLElement>(`[data-testid="visor-${name}"]`) ?? label.parentElement!;
    element.style.setProperty('--level', `${Math.round(value * 100)}%`);
    element.classList.toggle('danger', value < .25);
  };
  return {
    sync(world, target) {
      resource('air', world.player.air, airValue);
      resource('power', world.player.power, powerValue);
      resource('health', world.player.health, healthValue);
      find('visor-coordinates').textContent = `${world.player.position.x.toFixed(0)}° X / ${world.player.position.z.toFixed(0)}° Z`;
      find('visor-held').textContent = world.player.inventory.length
        ? `CARRYING ${world.player.inventory.map(item => item.kind.toUpperCase()).join(' · ')}` : 'HANDS EMPTY';
      find('visor-objective').textContent = world.componentInstalled ? 'SHIP REPAIRED' : 'REPAIR THE SHIP';
      find('visor-instruction').textContent = world.componentInstalled
        ? 'Board the ship to leave the planet.'
        : world.player.inventory.some(item => item.kind === 'component')
          ? 'Return to your ship and install the drive regulator.'
          : 'Find the missing drive regulator beyond the nesting grounds.';
      const carryingComponent = world.player.inventory.some(item => item.kind === 'component');
      const objective = carryingComponent || world.componentInstalled ? world.shipPosition
        : world.items.find(item => item.kind === 'component' && item.available)?.position;
      if (objective) {
        const dx = objective.x - world.player.position.x;
        const dz = objective.z - world.player.position.z;
        const bearing = Math.round((Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360);
        const range = Math.round(Math.hypot(dx, dz));
        find('visor-bearing').textContent = `${carryingComponent || world.componentInstalled ? 'SHIP' : 'DRIVE'} SIGNAL · ${String(bearing).padStart(3, '0')}° · ${range}M`;
      }
      const text = performance.now() < messageUntil ? message : target ? `[ E ] ${target.label}` : '';
      prompt.textContent = text;
      prompt.classList.toggle('visible', Boolean(text));
    },
    message(text, durationMs = 2800) { message = text; messageUntil = performance.now() + durationMs; },
  };
}

export function setDecisionConnection(status: 'ready' | 'waiting' | 'paused'): void {
  const label = document.querySelector<HTMLElement>('#visor-status');
  const overlay = document.querySelector<HTMLElement>('#connection');
  if (label) label.textContent = status === 'ready' ? 'LINK ACTIVE' : status === 'waiting' ? 'JEV LINK WAITING' : 'LINK LOST';
  if (overlay) overlay.hidden = status !== 'paused';
}
