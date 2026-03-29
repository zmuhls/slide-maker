<script lang="ts">
  import { base } from '$app/paths';
  import { api } from '$lib/api';
  import { page } from '$app/stores';

  let status = $state<'loading' | 'success' | 'error'>('loading');
  let message = $state('');

  $effect(() => {
    const token = $page.url.searchParams.get('token');
    if (!token) {
      status = 'error';
      message = 'No verification token provided.';
      return;
    }

    api.verify(token)
      .then(() => {
        status = 'success';
        message = 'Email verified! An admin will review your account.';
      })
      .catch((err: any) => {
        status = 'error';
        message = err.message || 'Verification failed.';
      });
  });
</script>

<svelte:head>
  <title>Verify Email - CUNY AI Lab Slide Wiz</title>
</svelte:head>

<div class="verify-page">
  <div class="verify-card">
    <div class="card-header">
      <h1>CUNY AI Lab</h1>
      <p>Email Verification</p>
    </div>
    <div class="card-body">
      {#if status === 'loading'}
        <p class="status-text">Verifying your email...</p>
      {:else if status === 'success'}
        <div class="success-message">{message}</div>
        <a href="{base}/login" class="link">Go to Sign In</a>
      {:else}
        <div class="error-message" role="alert">{message}</div>
        <a href="{base}/register" class="link">Back to Register</a>
      {/if}
    </div>
  </div>
</div>

<style>
  .verify-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-secondary);
    padding: 1rem;
  }

  .verify-card {
    width: 100%;
    max-width: 420px;
    background: var(--color-bg);
    border-radius: var(--radius-lg);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .card-header {
    background: var(--color-primary-dark);
    color: white;
    padding: 2rem;
    text-align: center;
  }

  .card-header h1 {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
  }

  .card-header p {
    font-size: 0.875rem;
    opacity: 0.85;
  }

  .card-body {
    padding: 2rem;
    text-align: center;
  }

  .status-text {
    color: var(--color-text-secondary);
    font-size: 0.9375rem;
  }

  .success-message {
    background: #f0fdf4;
    color: var(--color-success);
    padding: 0.75rem 1rem;
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    border: 1px solid #bbf7d0;
    margin-bottom: 1.5rem;
  }

  .error-message {
    background: #fef2f2;
    color: var(--color-error);
    padding: 0.75rem 1rem;
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    border: 1px solid #fecaca;
    margin-bottom: 1.5rem;
  }

  .link {
    color: var(--color-primary);
    font-size: 0.875rem;
    font-weight: 500;
    text-decoration: none;
  }

  .link:hover {
    text-decoration: underline;
  }
</style>
