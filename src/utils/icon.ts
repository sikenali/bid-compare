import type { Component } from 'vue';

export function riToCompName(riClass: string): string {
  const parts = riClass.replace('ri-', '').split('-');
  return 'Ri' + parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
}

export function resolveIcon(name: string | undefined): Component {
  if (!name) return {} as Component;
  const compName = riToCompName(name);
  return { __name: compName } as Component;
}
