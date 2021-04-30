<script lang="ts">
  import Auth from "./lib/components/Auth.svelte";
  import Code from "./lib/components/Code.svelte";

  let sentLink = false;
  let token = localStorage.getItem("token");

  async function getUser() {
    if (!token) return;
    try {
      const res = await fetch("http://localhost:5000/api/auth/user", {
        headers: { Authorization: "Bearer " + token }
      });
      const data = await res.json();
      console.log(data);
      if (res.ok && data.ok && data.user) {
        return data.user;
      }
      localStorage.removeItem("token");
      return null;
    } catch (e) {
      console.error(e);
      localStorage.removeItem("token");
      alert("An unknown error occured");
      return null;
    }
  }
</script>

<h1 class="w3-center">Welcome</h1>
{#if !token}
  <div class="w3-container">
    {#if !sentLink}
      <Auth on:prompt-code="{() => (sentLink = true)}" />
    {:else}
      <Code
        on:authenticated="{({ detail: token }) => {
          localStorage.setItem('token', token);
          window.location.reload();
        }}"
      />
    {/if}
  </div>
{:else}
  {#await getUser()}
    <p class="w3-center">Fetching user information</p>
  {:then user}
    {#if user}
      <p class="w3-center">Hello, {user.username}</p>
      <p class="w3-center">
        <button
          class="w3-button w3-black w3-hover-black"
          on:click="{() => {
            localStorage.removeItem('token');
            window.location.reload();
          }}">Logout</button
        >
      </p>
    {:else}
      <p class="w3-center">An error occured while fetching user data</p>
    {/if}
  {/await}
{/if}
