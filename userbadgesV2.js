(function () {
    if (window.__AVIA_PROFILE_BADGESV2__) return;
    window.__AVIA_PROFILE_BADGESV2__ = true;

    const BADGE_URL = "https://raw.githubusercontent.com/AvaLilac/AviaClientBadges/refs/heads/main/userbadgesbackend.js";

    let badgeData = null, loadingPromise = null;

    function loadBadges() {
        if (badgeData) return Promise.resolve();
        if (loadingPromise) return loadingPromise;

        loadingPromise = fetch(BADGE_URL + "?t=" + Date.now())
            .then(r => r.text())
            .then(code => {
                new Function(code)();
                badgeData = window.AVIA_USER_BADGES || [];
            })
            .catch(() => { badgeData = []; });

        return loadingPromise;
    }

    function getUsername(root) {
        const tag = root.querySelector("span.fw_200");
        if (!tag) return null;
        const span = tag.parentElement;
        return span ? span.textContent.trim() : null;
    }

    function getUserBadges(username) {
        if (!badgeData) return [];
        const clean = username.trim().toLowerCase();
        return badgeData.filter(b =>
            b.users.some(u => u.toLowerCase() === clean)
        );
    }

    function findCardByTitle(root, title) {
        return [...root.querySelectorAll("div.pos_relative")]
            .find(c => {
                const heading = c.querySelector("span.fw_550");
                return heading && heading.textContent.trim() === title;
            });
    }

    let tooltip = null;
    let tooltipText = null;

    function getTooltip() {
        if (!tooltip) {
            tooltip = document.createElement("div");
            tooltip.style.cssText = "position:fixed;z-index:9999;pointer-events:none;display:none;";
            const inner = document.createElement("div");
            inner.className = "bg_black p_var(--gap-md) bdr_var(--borderRadius-md) lh_0.875rem fs_0.6875rem ls_0.03125rem fw_500";
            tooltipText = document.createElement("span");
            inner.appendChild(tooltipText);
            tooltip.appendChild(inner);
            document.body.appendChild(tooltip);
        }
        return tooltip;
    }

    function showTooltip(e, badge) {
        getTooltip();
        tooltipText.textContent = badge.name;
        const color = badge.color || "";
        if (color.includes("gradient")) {
            tooltipText.style.background = color;
            tooltipText.style.webkitBackgroundClip = "text";
            tooltipText.style.webkitTextFillColor = "transparent";
            tooltipText.style.color = "transparent";
        } else {
            tooltipText.style.background = "";
            tooltipText.style.webkitBackgroundClip = "";
            tooltipText.style.webkitTextFillColor = "";
            tooltipText.style.color = color || "white";
        }
        tooltip.style.display = "block";
        positionTooltip(e);
    }

    function positionTooltip(e) {
        getTooltip();
        const rect = tooltip.getBoundingClientRect();
        let x = e.clientX - rect.width / 2;
        let y = e.clientY - rect.height - 8;
        x = Math.max(4, Math.min(x, window.innerWidth - rect.width - 4));
        y = Math.max(4, y);
        tooltip.style.left = x + "px";
        tooltip.style.top = y + "px";
    }

    function hideTooltip() {
        getTooltip();
        tooltip.style.display = "none";
    }

    function makeBadgeSpan(b) {
        const wrapper = document.createElement("span");
        wrapper.setAttribute("aria-label", b.name);
        wrapper.style.cssText = "display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;font-size:20px;line-height:1;cursor:default;position:relative;";
        wrapper.textContent = b.icon;
        wrapper.addEventListener("mouseenter", e => showTooltip(e, b));
        wrapper.addEventListener("mousemove",  e => positionTooltip(e));
        wrapper.addEventListener("mouseleave", hideTooltip);
        return wrapper;
    }

    function injectBadges(root, username) {
        if (root.querySelector("[data-avia-badge-injected='true']")) return;

        const badges = getUserBadges(username);
        if (!badges.length) return;

        const nativeBadgesCard = findCardByTitle(root, "Badges");
        if (nativeBadgesCard) {
            const grid = nativeBadgesCard.querySelector("div.d_flex.flex-wrap_wrap");
            if (!grid) return;
            badges.forEach(b => grid.appendChild(makeBadgeSpan(b)));
            nativeBadgesCard.dataset.aviaBadgeInjected = "true";
            return;
        }

        const joinedCard = findCardByTitle(root, "Joined");
        if (!joinedCard) return;

        const card = joinedCard.cloneNode(false);
        card.removeAttribute("data-avia-badge-injected");
        card.dataset.aviaBadgeInjected = "true";
        card.style.cssText = "overflow:hidden;";
        if (!card.classList.contains("asp_1/1")) card.classList.add("asp_1/1");

        const titleSpan = joinedCard.querySelector("span.fw_550");
        const title = titleSpan ? titleSpan.cloneNode(false) : document.createElement("span");
        title.textContent = "Badges";
        card.appendChild(title);

        const grid = document.createElement("div");
        grid.className = "gap_var(--gap-md) d_flex flex-wrap_wrap [&_img,_&_svg]:w_24px [&_img,_&_svg]:h_24px [&_img,_&_svg]:asp_1/1";
        grid.style.overflow = "hidden";
        badges.forEach(b => grid.appendChild(makeBadgeSpan(b)));
        card.appendChild(grid);

        joinedCard.insertAdjacentElement("afterend", card);
    }

    async function processProfile(root) {
        await loadBadges();

        const username = getUsername(root);
        if (!username) return;

        if (findCardByTitle(root, "Badges")) {
            injectBadges(root, username);
            return;
        }

        const obs = new MutationObserver(() => {
            if (!findCardByTitle(root, "Joined")) return;
            if (!findCardByTitle(root, "Bio")) return;
            obs.disconnect();
            injectBadges(root, username);
        });

        obs.observe(root, { childList: true, subtree: true });

        if (findCardByTitle(root, "Joined") && findCardByTitle(root, "Bio")) {
            obs.disconnect();
            injectBadges(root, username);
        }

        setTimeout(() => obs.disconnect(), 10000);
    }

    const observer = new MutationObserver(muts => {
        for (const m of muts) {
            for (const n of m.addedNodes) {
                if (!(n instanceof HTMLElement)) continue;

                if (n.matches?.("div.will-change_transform")) processProfile(n);
                if (n.matches?.("div.p_24px.min-w_280px.max-w_560px")) processProfile(n);

                const small    = n.querySelector?.("div.will-change_transform");
                const expanded = n.querySelector?.("div.p_24px.min-w_280px.max-w_560px");
                if (small)    processProfile(small);
                if (expanded) processProfile(expanded);
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
