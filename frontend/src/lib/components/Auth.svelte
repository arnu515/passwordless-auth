<script lang="ts">
  import { createEventDispatcher } from "svelte";

  const d = createEventDispatcher();

  async function requestCode() {
    const email = (document.getElementById("email") as HTMLInputElement)?.value;
    if (!email?.trim()) return;

    try {
      const res = await fetch("http://localhost:5000/api/auth/send_magic_link", {
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email }),
        method: "POST"
      });

      const data = await res.json();
      if (res.ok && data.ok) d("prompt-code");
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
  <h2 class="w3-center">Authenticate</h2>

  <form class="w3-margin" on:submit|preventDefault="{requestCode}">
    <p>
      <label for="email">Email</label>
      <input type="email" id="email" class="w3-input w3-border w3-border-gray" />
    </p>
    <p>
      <button class="w3-button w3-black w3-hover-black" style="width: 100%"
        >Get magic link</button
      >
    </p>
  </form>
</div>
