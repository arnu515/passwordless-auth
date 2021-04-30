<script lang="ts">
  import { createEventDispatcher } from "svelte";

  const d = createEventDispatcher();

  async function getToken() {
    const code = (document.getElementById("code") as HTMLInputElement)?.value;
    if (!code) return;

    try {
      const res = await fetch(
        "http://localhost:5000/api/auth/token?code=" + code
      );

      const data = await res.json();
      if (res.ok && data.ok) d("authenticated", data.token);
      else {
        console.error(data);
        alert(data.error || res.statusText);
      }
    } catch (e) {
      console.error(e);
      alert("An unknown error occured");
    }
  }
</script>

<div class="w3-border w3-border-gray w3-padding w3-rounded">
  <h2 class="w3-center">Enter code</h2>

  <form class="w3-margin" on:submit|preventDefault="{getToken}">
    <p>
      <label for="code">Enter the code sent to you by email</label>
      <input type="number" id="code" class="w3-input w3-border w3-border-gray" />
    </p>
    <p>
      <button class="w3-button w3-black w3-hover-black" style="width: 100%"
        >Authenticate</button
      >
    </p>
  </form>
</div>
