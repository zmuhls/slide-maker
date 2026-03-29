<script lang="ts">
  import RegisterForm from '$lib/components/auth/RegisterForm.svelte';
</script>

<svelte:head>
  <title>Register - CUNY AI Lab Slide Wiz</title>
</svelte:head>

<div class="auth-page">
  <RegisterForm />
</div>

<style>
  .auth-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-secondary);
    padding: 1rem;
  }
</style>
