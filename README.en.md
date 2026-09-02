# Desktop App for Sharkord

<div align="left">
  <img src="https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E" alt="JavaScript" />
  <img src="https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white" alt="Windows" />
</div>

<br>

*Leia em [Português](README.md)*

**Important Notice:** This project is not a copy, fork, or competing project of Sharkord. It is solely a desktop client (wrapper/web app) developed to facilitate the use of the original web interface. This project was created without any profit motive, being completely open-source and freely accessible to the community.

---

## What is This Project?

The Desktop App for Sharkord is an Electron-based solution that encapsulates the web interface of any self-hosted Sharkord server into a native computer application format.

By default, Sharkord is accessed through web browsers. However, for users who prefer the feel of a dedicated app — with full support for independent shortcuts, a separate window, and native resource management —, this application serves as the ideal bridge.

### How it Works

Upon opening the app for the first time, you will be greeted by a clean and modern setup screen asking for the address (URL) of your personal Sharkord server. Once entered, the app will save this information locally. The next time you start the app, it will skip the setup step and connect you directly to your server.

### Built-in Features

- **Optimized Native Permissions:** The application is pre-configured to interact with the operating system and automatically authorize the use of microphones and cameras, saving the user from repetitive browser prompts.
- **Advanced Screen Sharing:** With direct support to the operating system's API for capturing specific screens and windows.
- **Silent Updates:** Once packaged and distributed, the application features background check modules to download newer installations, keeping the user experience seamless.
- **Immersive Interface:** Removal of the conventional browser title bar to ensure your server gets 100% of your visual attention.
- **Domain Control (Whitelist):** For routing and security purposes, the application only allows connections and navigation to URLs that have a subdomain strictly starting with the word `sharkord` (e.g., `https://sharkord.yourdomain.com`). There is also a default exception that accepts direct connections to the official server at `https://demo.sharkord.com/`.
- **Persistent Tabs System:** The application supports multiple tabs. When you close the app, the state of your tabs is automatically saved so they remain open the next time you launch it!
- **Broad Compatibility:** Fully compatible and running smoothly and stably on the latest versions of **Windows 10** and **Windows 11**.

## Contributing

Since this is an open-source tool focused on the community and without profit restrictions, any contribution to improve the security, performance, or compatibility of this desktop client is highly encouraged and appreciated.

To collaborate, feel free to clone the repository, test the tools, and open pull requests.

## Original Project

This application was developed to connect to servers on the Sharkord platform. You can find the source code and all documentation for the original and official web project at the link below:

[Official Sharkord Repository](https://github.com/sharkord/sharkord)

## To the Original Developers

This project was created entirely by admirers of the Sharkord platform. Our sole intention is to provide a more practical access alternative (a native wrapper) to facilitate the user experience on desktop computers, expanding the reach and usefulness of the excellent original tool.

We emphasize that **there is no intention of plagiarism, cloning, or intellectual property theft**, and the application is provided strictly free and open-source.

If the development team or the original creator of Sharkord has any objections to this desktop client or wishes for this repository to be removed, we kindly ask you to contact us. We fully respect the rights of the original creators and will promptly comply with any formal takedown request.
