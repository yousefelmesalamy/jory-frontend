import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { TranslationService } from '../../../../core/i18n/translation.service';
import { ReviewService } from '../../../../core/services/review.service';

@Component({
  selector: 'app-review-form',
  imports: [ReactiveFormsModule],
  templateUrl: './review-form.html',
  styleUrl: './review-form.scss',
})
export class ReviewForm {
  private readonly reviews = inject(ReviewService);
  private readonly fb = inject(FormBuilder);
  private readonly translation = inject(TranslationService);

  readonly t = this.translation.t;
  readonly slug = input('');
  /** Fires once the review is accepted, so the parent can refresh the list and average. */
  readonly posted = output<void>();

  protected readonly stars = [1, 2, 3, 4, 5];

  protected readonly form = this.fb.nonNullable.group({
    rating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
    title: ['', Validators.required],
    body: ['', Validators.required],
  });

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly posted_ = signal(false);

  protected setRating(value: number): void {
    this.form.controls.rating.setValue(value);
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');
    this.posted_.set(false);

    const { rating, title, body } = this.form.getRawValue();
    this.reviews.submit(this.slug(), rating, title, body).subscribe({
      next: () => {
        this.submitting.set(false);
        this.posted_.set(true);
        this.form.reset({ rating: 0, title: '', body: '' });
        this.posted.emit();
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        this.errorMessage.set(this.messageFor(error));
      },
    });
  }

  private messageFor(error: HttpErrorResponse): string {
    const copy = this.t();
    switch (error.status) {
      case 401:
        return copy.reviewSignInRequired;
      case 403:
        return copy.reviewNotPermitted;
      case 400:
        return copy.reviewAlreadySubmitted;
      default:
        return copy.reviewSubmitError;
    }
  }
}
