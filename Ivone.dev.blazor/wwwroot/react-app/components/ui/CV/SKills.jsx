import React from 'react';

const skills = [
    "ASP.NET", "JavaScript", "Bootstrap", "Blazor Mobile (Learning)", ".NET Core",
    "Web APIs", "IIS", "Azure (Learning)", "EF", "Ajax", "HTML5", "React (Learning)",
    "TSQL", "MySQL", "CSS3", "Blazor (Learning)", "MVC", "Android (native)"
];

const Skills = () => {
    return (
        <section className="skills-wrap">
            <h2 className="heading">SKILLS</h2>
            <div className="skills">
                {skills.map((skill, index) => (
                    <div className="skill" key={index}>
                        <span className="dot">•</span><span className="title">{skill}</span>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default Skills;
