import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Entity } from '@exlibris/exl-cloudapp-angular-lib';
import { UserData } from '../../interfaces/user.interface';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-set-selector',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, MatButtonModule],
  templateUrl: './set-selector.component.html',
  styleUrl: './set-selector.component.scss'
})
export class SetSelectorComponent {
  @Input() hasValidSets: boolean = false;
  @Input() availableSets: Entity[] = [];
  @Input() loading: boolean = false;
  @Input() selectedSet: Entity | null = null;
  @Input() usersWithNotes: UserData[] = [];
  @Input() processingNotes: boolean = false;

  @Output() selectSet = new EventEmitter<Entity>();
  @Output() clearSet = new EventEmitter<void>();
  @Output() backToIntakeMethod = new EventEmitter<void>();

  onSetSelected(set: Entity) {
    this.selectSet.emit(set);
  }

  clearSelection() {
    this.clearSet.emit();
  }

  goBack() {
    this.backToIntakeMethod.emit();
  }
}

