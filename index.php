﻿<?php include 'header.php'; ?>

	<!-- Header -->
		<header id="header">
			<a href="index.php" class="logo"><strong>Porodično stablo</strong> porodice Marković</a>
			<ul class="icons">
				<li><a href="http://fb.com/nikola.markovic" class="icon fa-facebook"><span class="label">Facebook</span></a></li>
				<li><a href="http://instagram.com/likbezkola" class="icon fa-instagram"><span class="label">Instagram</span></a></li>
				<li><a href="http://nikolamarkovic.tk" class="icon fa-medium"><span class="label">Medium</span></a></li>
			</ul>
		</header>

								<section>

<div style="display:none"> <form><strong>IMENA: </strong> <label><input type="radio" name="mode">SAKRIJ</label> <label><input type="radio" name="mode" checked>PRIKAŽI</label> <label><input type="radio" name="mode">Deca</label></span> </form></div>
<script>if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|BB|PlayBook|IEMobile|Windows Phone|Kindle|Silk|Opera Mini/i.test(navigator.userAgent)) {
    document.write("<b>Sajt nije prilagođen mobilnim telefonima. Za najbolji prikaz, posetite nas preko računara ili tableta :)</b>");
}</script>

<div id="vis" class="centar"></div>

<script src="funkcija.js" charset="utf-8"></script>
<script>
    window.onload = function () {
        updateGraph("markovic.json");
    }
</script>

								</section>
						</div>
					</div>


<?php include 'sidebar.php'; ?>


			</div><!-- kraj Wrapper -->


<?php include 'footer.php'; ?>
