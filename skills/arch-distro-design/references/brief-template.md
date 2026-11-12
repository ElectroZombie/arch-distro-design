# The Design Brief — fill-in template

> Supporting file for `arch-distro-design`. Copy this, fill it in with the
> user, and save it as `brief.md` in the project root.

## 1. The seven mandatory categories

Every category needs an **explicit answer**. "It depends" is not an answer — if
the user does not know, ask and record the question, never guess.

```markdown
# Brief — <project name>

**Objective:**        <server, kiosk, workstation, appliance…>
**Output format:**    <live ISO | persistent .img | both>
**Target hardware:**  <x86_64 UEFI/BIOS, USB, HDD, SSD, NVMe, size>
**Network policy:**   <enabled | disabled by default>
**Apps / payloads:**  <which apps, runtime, database>
**Immutability:**     <squashfs ro | rw with update rule | overlay>
**Update policy:**    <how and when updates apply>

**Disk size:**        <GB>          -> fixes the partition table
**Desktop layer:**    <L0 console-only | L1 Openbox | L2 LXQT | L3 XFCE | L4 Cinnamon | L5 KDE | L6 GNOME>
```

## 2. The artifact contract

Write this to `artifact-contract.md`. It is what stops the ISO and the `.img`
from swallowing each other's contents.

```markdown
| Artifact | Contains | Does NOT contain |
|---|---|---|
| ISO | live rootfs, frozen repo, CLI installer | app code, payloads |
| .img | installed rootfs, services, DATA partition | frozen repo, app code |
| payload | code + deps + unit + config | anything from the base OS |
```

## 3. The derived decisions

The Brief does not ask for these, but they cannot be left implicit — each one
changes the build:

| Decision | Derived from | Where it lands |
|---|---|---|
| Desktop layer | the objective | `profiledef.sh:desktop_layer` |
| Package set | the objective + the layer | `packages.x86_64` |
| Frozen package list | the offline requirement | `builder/repo-packages.txt` |
| Partition table | the disk size | `build.sh --disk` + `parted` |
| Payload manifests | the apps | `apps/<slug>/app.conf` |

## 4. Validation plan

| Gate | When | Skill |
|---|---|---|
| Profile checks | before `mkarchiso` | `arch-iso-builder` |
| Partition layout | after the `.img` is built | `arch-appliance-img` |
| QEMU checklists | before any physical write | `arch-qemu-validation` |
| Media validation | after writing to the USB | `arch-hardware-handler` |

## 5. The layer model (build layers)

The router's layers are `B0..B4` — **not** the `L0..L6` desktop layers of
`arch-desktop-layers`.

| Layer | Content |
|---|---|
| **B-1** | DATA: partition portable across machines |
| **B0** | boot + firmware + bootloader (UEFI+BIOS) |
| **B1** | base: kernel, shell, tools, locales, TZ |
| **B2** | services: ssh, network (networkd), update-unit, time |
| **B3** | web platform: nginx, nftables, no DB |
| **B4** | app payloads |
