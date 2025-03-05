import React from 'react';

const projects = [
    { name: "https://gtaguessr.com/", role: "Owner", period: "Feb 2021 - Present" },
    { name: "Mobile Apps", role: "Developer", period: "Jul 2011 - Present" }
];

const Projects = () => {
    return (
        <section>
            <h2 className="professional-experience">PERSONAL PROJECTS</h2>
            {projects.map((proj, index) => (
                <div className="job" key={index}>
                    <div className="job-heading">
                        <div className="job-title">{proj.name}</div>
                        <div className="job-duration">{proj.period}</div>
                    </div>
                    <div className="employer-position">{proj.role}</div>
                </div>
            ))}
        </section>
    );
};

export default Projects;
