// This file contains JavaScript code that handles the functionality of the application.
// It includes functions for form validation, data handling, and navigation between pages.

document.addEventListener("DOMContentLoaded", function() {
    const ophaaladresInput = document.getElementById("ophaaladres");
    const afzetadresInput = document.getElementById("afzetadres");
    const submitButton = document.querySelector("button");

    submitButton.addEventListener("click", function() {
        verstuurRitgegevens();
    });

    function verstuurRitgegevens() {
        const ophaaladres = ophaaladresInput.value;
        const afzetadres = afzetadresInput.value;

        if (!ophaaladres || !afzetadres) {
            alert("Vul beide adressen in.");
            return;
        }

        // Gegevens opslaan in localStorage
        localStorage.setItem("ophaaladres", ophaaladres);
        localStorage.setItem("afzetadres", afzetadres);

        // Stuur door naar de chauffeurstoewijzingspagina
        window.location.href = "chauffeurstoewijzing.html";
    }
});