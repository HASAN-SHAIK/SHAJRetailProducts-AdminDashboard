import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../../src/components/common/LoadingSpinner';

describe('LoadingSpinner', () => {
	it('renders progress indicator', () => {
		render(<LoadingSpinner />);
		expect(screen.getByRole('progressbar')).toBeInTheDocument();
	});
});

