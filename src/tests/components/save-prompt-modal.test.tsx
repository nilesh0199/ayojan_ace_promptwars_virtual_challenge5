import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SavePromptModal } from '@/components/save-prompt-modal';
import { AuthProvider, useAuth } from '@/components/auth-context';

function ModalTrigger() {
  const { openSaveModal } = useAuth();
  return (
    <div>
      <button onClick={openSaveModal}>Trigger Save</button>
      <SavePromptModal />
    </div>
  );
}

describe('SavePromptModal Component', () => {
  it('opens dialog when save is requested in guest mode', () => {
    render(
      <AuthProvider>
        <ModalTrigger />
      </AuthProvider>
    );

    const triggerBtn = screen.getByRole('button', { name: /Trigger Save/i });
    fireEvent.click(triggerBtn);

    const dialog = screen.getByRole('dialog', { name: /Save Your Celebration Plan/i });
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Sign in with Google/i })
    ).toBeInTheDocument();
  });

  it('closes dialog when Esc key or Close button is pressed', () => {
    render(
      <AuthProvider>
        <ModalTrigger />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Trigger Save/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /Close dialog/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
